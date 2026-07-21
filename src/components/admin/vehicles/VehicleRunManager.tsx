"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { typo } from "@/constants/typography";
import { ACTION, CREATE_ICON, createLabel } from "@/constants/actionButton";
import { Button, buttonVariants } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { adminKeys } from "@/lib/admin/queryKeys";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { formatDate, formatClockTime } from "@/lib/date";
import { fetchAdminVehicleRuns, deleteVehicleRun, VEHICLE_ADMIN_PAGE_SIZE } from "@/lib/api/vehicles.admin";
import type { VehicleRunDetailResponse } from "@/lib/api/types";
import { VehicleRunFormDialog } from "./VehicleRunFormDialog";

// vehicle-run-manager(DESIGN.md): 지난 운행 포함 전체 목록(최신 출발순) — URL 구동 페이지네이션.
export function VehicleRunManager() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? "0") || 0;

  const list = useQuery({
    queryKey: adminKeys.list("vehicle-runs", { page, size: VEHICLE_ADMIN_PAGE_SIZE }),
    queryFn: () => fetchAdminVehicleRuns({ page }),
    placeholderData: keepPreviousData,
    retry: false,
  });

  // 조회 실패는 토스트로 알린다(빈 목록과 혼동 방지).
  useEffect(() => {
    if (list.isError) adminOnError()(list.error);
  }, [list.isError, list.error]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<VehicleRunDetailResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VehicleRunDetailResponse | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => deleteVehicleRun(id),
    onError: adminOnError(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.listAll("vehicle-runs") });
      qc.invalidateQueries({ queryKey: ["vehicle-runs"] }); // 운영자 겸 교인 세션의 회원 목록 동기화
      notify.success("삭제했습니다.");
      setDeleteTarget(null);
    },
  });

  const departLabel = (r: VehicleRunDetailResponse) => `${formatDate(r.departsAt)} ${formatClockTime(r.departsAt)}`;

  const columns: Column<VehicleRunDetailResponse>[] = [
    { key: "departsAt", header: "출발 시각", cell: (r) => <span className={typo.datetime}>{departLabel(r)}</span> },
    { key: "note", header: "메모", cell: (r) => r.note ?? "" },
  ];

  const pageMeta = list.data?.page;
  return (
    <>
      <div className="flex justify-end">
        <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
          <CREATE_ICON size={18} aria-hidden />
          {createLabel("운행일")}
        </Button>
      </div>
      <div className="mt-base">
        <DataTable
          columns={columns}
          rows={list.data?.content ?? []}
          rowKey={(r) => r.id}
          loading={list.isPending}
          empty={<EmptyState message="등록된 운행일이 없습니다." />}
          actions={(r) => (
            <div className="flex justify-end gap-xs">
              {/* 단건 GET 없음 — 명단 페이지 제목용 출발시각을 표시 전용 쿼리로 전달(스펙 §6). */}
              <Link
                href={`/mypage/manage/vehicle-runs/${r.id}?departsAt=${encodeURIComponent(r.departsAt)}`}
                aria-label={`${departLabel(r)} 탑승 명단`}
                className={buttonVariants("tertiary")}
              >
                <Users size={18} aria-hidden />
                <span className="hidden lg:inline">명단</span>
              </Link>
              <Button type="button" variant="tertiary" aria-label={`${departLabel(r)} 수정`} onClick={() => setEditTarget(r)}>
                <ACTION.edit.Icon size={18} aria-hidden />
                <span className="hidden lg:inline">{ACTION.edit.label}</span>
              </Button>
              <Button type="button" variant="tertiary" aria-label={`${departLabel(r)} 삭제`} onClick={() => setDeleteTarget(r)}>
                <ACTION.delete.Icon size={18} aria-hidden />
                <span className="hidden lg:inline">{ACTION.delete.label}</span>
              </Button>
            </div>
          )}
        />
      </div>
      {pageMeta && pageMeta.totalPages > 1 ? (
        <div className="mt-xl">
          <Pagination page={pageMeta} scroll={false} />
        </div>
      ) : null}

      <VehicleRunFormDialog open={createOpen} onOpenChange={setCreateOpen} editTarget={null} />
      <VehicleRunFormDialog
        open={editTarget != null}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        editTarget={editTarget}
      />
      <DeleteConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title={deleteTarget ? `${departLabel(deleteTarget)} 운행일을 삭제할까요?` : "운행일을 삭제할까요?"}
        warning="탑승 신청 명단도 함께 사라집니다."
        pending={remove.isPending}
        onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id); }}
      />
    </>
  );
}
