"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { formatDate, formatClockTime } from "@/lib/date";
import { useVehicleRuns, useCancelVehicleRequest } from "./queries";
import { VehicleApplyDialog } from "./VehicleApplyDialog";
import type { VehicleRunCardResponse } from "@/lib/api/types";

// vehicle-run-card(DESIGN.md): schedule-card 변형 — surface-soft 카드에 출발시각·메모·신청 상태/액션.
export function VehicleRunList() {
  const sp = useSearchParams();
  const pageParam = Number(sp.get("page") ?? "0");
  const page = Number.isInteger(pageParam) && pageParam >= 0 ? pageParam : 0;

  const list = useVehicleRuns(page);
  const cancel = useCancelVehicleRequest();
  const [applyTarget, setApplyTarget] = useState<VehicleRunCardResponse | null>(null);
  const [cancelTarget, setCancelTarget] = useState<VehicleRunCardResponse | null>(null);

  if (list.isPending) {
    return (
      <div className="mt-xl flex flex-col gap-lg" aria-hidden>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }
  if (list.isError || !list.data) {
    return <p className={cn(typo.bodyMd, "mt-xl text-muted")}>목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>;
  }

  const runs = list.data.content;
  const departLabel = (run: VehicleRunCardResponse) => `${formatDate(run.departsAt)} ${formatClockTime(run.departsAt)}`;

  return (
    <div className="mt-xl flex flex-col gap-lg">
      {runs.length === 0 ? <EmptyState message="예정된 운행일이 없습니다." /> : null}
      {runs.map((run) => (
        <section key={run.id} className="rounded-xl bg-surface-soft p-xl">
          <div className="flex flex-wrap items-center justify-between gap-base">
            <div className="flex flex-col gap-xxs">
              <p className={cn(typo.datetimeLg, "text-ink")}>{departLabel(run)} 출발</p>
              {run.note ? <p className={cn(typo.bodySm, "text-muted")}>{run.note}</p> : null}
            </div>
            {run.myRequest ? (
              <div className="flex flex-col items-end gap-xs">
                <Badge variant="primary">신청됨</Badge>
                <p className={cn(typo.bodySm, "text-body")}>픽업: {run.myRequest.pickupLocation}</p>
                {run.myRequest.note ? <p className={cn(typo.caption, "text-muted")}>{run.myRequest.note}</p> : null}
                <Button type="button" variant="tertiary" onClick={() => setCancelTarget(run)}>신청 취소</Button>
              </div>
            ) : (
              <Button type="button" variant="primary" onClick={() => setApplyTarget(run)}>탑승 신청</Button>
            )}
          </div>
        </section>
      ))}

      {list.data.page.totalPages > 1 ? <Pagination page={list.data.page} /> : null}

      <VehicleApplyDialog run={applyTarget} onOpenChange={(v) => { if (!v) setApplyTarget(null); }} />
      <DeleteConfirmDialog
        open={cancelTarget != null}
        onOpenChange={(v) => { if (!v) setCancelTarget(null); }}
        title="탑승 신청을 취소할까요?"
        warning={cancelTarget ? `${departLabel(cancelTarget)} 출발 운행입니다.` : undefined}
        confirmLabel="신청 취소"
        pending={cancel.isPending}
        onConfirm={() => {
          if (cancelTarget) cancel.mutate(cancelTarget.id, { onSuccess: () => setCancelTarget(null) });
        }}
      />
    </div>
  );
}
