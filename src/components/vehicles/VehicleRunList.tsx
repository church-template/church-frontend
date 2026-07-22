"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { kakaoMapPinUrl } from "@/lib/mapLink";
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
          {/* 헤더: 운행 정보(좌) + 상태 배지(우) */}
          <div className="flex flex-wrap items-start justify-between gap-base">
            <div className="flex flex-col gap-xxs">
              <p className={cn(typo.datetimeLg, "text-ink")}>{departLabel(run)} 출발</p>
              {run.note ? <p className={cn(typo.bodySm, "text-muted")}>{run.note}</p> : null}
            </div>
            {run.myRequest ? (
              // 확정 상태 어피던스 — 일반 라벨 칩보다 의도적(lucide Check, 텍스트가 의미 전달이라 aria-hidden)
              <Badge variant="primary" className="gap-xxs">
                <Check size={14} aria-hidden />
                신청됨
              </Badge>
            ) : null}
          </div>

          {run.myRequest ? (
            // 내 신청: 헤어라인으로 운행 정보와 구분 + 좌측 정렬 라벨/값(한글 가독성)
            <div className="mt-md border-t border-hairline pt-md">
              <dl className="flex flex-col gap-sm">
                <div className="flex gap-md">
                  <dt className={cn(typo.caption, "w-20 shrink-0 text-muted")}>픽업 장소</dt>
                  <dd className={cn(typo.bodySm, "text-body")}>
                    {run.myRequest.pickupLocation ? run.myRequest.pickupLocation : "위치 첨부됨"}
                  </dd>
                </div>
                {run.myRequest.note ? (
                  <div className="flex gap-md">
                    <dt className={cn(typo.caption, "w-20 shrink-0 text-muted")}>메모</dt>
                    <dd className={cn(typo.bodySm, "text-body")}>{run.myRequest.note}</dd>
                  </div>
                ) : null}
                {run.myRequest.latitude != null && run.myRequest.longitude != null ? (
                  <div className="flex gap-md">
                    <dt className={cn(typo.caption, "w-20 shrink-0 text-muted")}>위치</dt>
                    <dd>
                      <a
                        href={kakaoMapPinUrl(run.myRequest.latitude, run.myRequest.longitude, run.myRequest.pickupLocation)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(typo.bodySm, "text-primary underline-offset-4 hover:underline")}
                      >
                        지도 보기
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-md flex justify-end">
                <Button type="button" variant="tertiary" onClick={() => setCancelTarget(run)}>신청 취소</Button>
              </div>
            </div>
          ) : (
            <div className="mt-md flex justify-end">
              <Button type="button" variant="primary" onClick={() => setApplyTarget(run)}>탑승 신청</Button>
            </div>
          )}
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
