"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { ACTION, CREATE_ICON } from "@/constants/actionButton";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { getPositions } from "@/lib/api/positions";
import { deletePosition } from "@/lib/api/positions.admin";
import type { PositionResponse } from "@/lib/api/types";
import { PositionFormDialog } from "./PositionFormDialog";

export function PositionManager() {
  const qc = useQueryClient();
  const { data: positions = [], isLoading, isError, error } = useQuery({ queryKey: ["positions"], queryFn: getPositions });

  // 목록 조회 실패는 토스트로 알린다(빈 목록과 혼동 방지). notify 호출이라 effect 내 setState 아님.
  useEffect(() => {
    if (isError) adminOnError()(error);
  }, [isError, error]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PositionResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PositionResponse | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => deletePosition(id),
    onError: adminOnError(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["positions"] });
      notify.success("삭제했습니다.");
      setDeleteTarget(null);
    },
  });

  const columns: Column<PositionResponse>[] = [
    { key: "name", header: "이름", cell: (p) => p.name },
    { key: "sortOrder", header: "정렬 순서", cell: (p) => p.sortOrder },
  ];

  return (
    <>
      <div className="mt-base flex items-start gap-xs rounded-xl bg-surface-soft p-base">
        <Info size={20} aria-hidden className="mt-xxs shrink-0 text-muted" />
        <p className={cn(typo.bodySm, "text-body")}>직분은 표시용 이름이며 로그인 권한과 무관합니다.</p>
      </div>

      <div className="mt-lg flex justify-end">
        <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
          <CREATE_ICON size={18} aria-hidden />
          새 직분
        </Button>
      </div>
      <div className="mt-base">
        <DataTable
          columns={columns}
          rows={positions}
          rowKey={(p) => p.id}
          loading={isLoading}
          empty={<p className={cn(typo.bodyMd, "text-muted")}>등록된 직분이 없습니다.</p>}
          actions={(p) => (
            <div className="flex justify-end gap-xs">
              <Button type="button" variant="tertiary" aria-label={`${p.name} 수정`} onClick={() => setEditTarget(p)}>
                <ACTION.edit.Icon size={18} aria-hidden />
                <span className="hidden lg:inline">{ACTION.edit.label}</span>
              </Button>
              <Button type="button" variant="tertiary" aria-label={`${p.name} 삭제`} onClick={() => setDeleteTarget(p)}>
                <ACTION.delete.Icon size={18} aria-hidden />
                <span className="hidden lg:inline">{ACTION.delete.label}</span>
              </Button>
            </div>
          )}
        />
      </div>

      <PositionFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      <PositionFormDialog
        open={editTarget != null}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        mode="edit"
        initial={editTarget ?? undefined}
      />
      <DeleteConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title={deleteTarget ? `'${deleteTarget.name}' 직분을 삭제할까요?` : "직분을 삭제할까요?"}
        warning="이 직분을 삭제합니다. 되돌릴 수 없습니다."
        pending={remove.isPending}
        onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id); }}
      />
    </>
  );
}
