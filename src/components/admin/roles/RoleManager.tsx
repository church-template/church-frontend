"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { adminKeys } from "@/lib/admin/queryKeys";
import { notify } from "@/lib/notify";
import { useMe } from "@/lib/auth/useMe";
import { getRoles, deleteRole, type RoleResponse } from "@/lib/api/roles.admin";
import { canManageRole } from "@/lib/admin/roleGuards";
import { RoleFormDialog } from "./RoleFormDialog";
import { RolePermissionsDialog } from "./RolePermissionsDialog";

export function RoleManager() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  // me 로딩 전엔 undefined — 우선순위 판정을 보류한다(0 폴백 시 모든 역할이 과도 비활성되는 것 방지).
  const maxPriority = me?.maxPriority;
  const { data: roles = [], isLoading, isError, error } = useQuery({ queryKey: adminKeys.list("roles"), queryFn: getRoles });

  // 목록 조회 실패는 토스트로 알린다(빈 목록과 혼동 방지). notify 호출이라 effect 내 setState 아님.
  useEffect(() => {
    if (isError) adminOnError()(error);
  }, [isError, error]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RoleResponse | null>(null);
  const [permTarget, setPermTarget] = useState<RoleResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleResponse | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onError: adminOnError(), // ROLE_IN_USE는 handleApiError가 안내 토스트 처리
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.list("roles") });
      notify.success("삭제했습니다.");
      setDeleteTarget(null);
    },
  });

  const columns: Column<RoleResponse>[] = [
    { key: "name", header: "역할명", cell: (r) => r.name },
    { key: "priority", header: "우선순위", cell: (r) => <span className={typo.datetime}>{r.priority}</span> },
    { key: "permCount", header: "권한", cell: (r) => r.permissions.length },
    { key: "system", header: "시스템 역할", cell: (r) => (r.isSystem ? <Badge>시스템</Badge> : null) },
  ];

  return (
    <>
      <div className="mt-base flex items-start gap-xs rounded-xl bg-surface-soft p-base">
        <Info size={20} aria-hidden className="mt-xxs shrink-0 text-muted" />
        <p className={cn(typo.bodySm, "text-body")}>시스템 역할과 내 등급보다 높은 역할은 변경할 수 없습니다.</p>
      </div>

      <div className="mt-lg flex justify-end">
        <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>역할 추가</Button>
      </div>
      <div className="mt-base">
        <DataTable
          columns={columns}
          rows={roles}
          rowKey={(r) => r.id}
          loading={isLoading}
          empty={<p className={cn(typo.bodyMd, "text-muted")}>등록된 역할이 없습니다.</p>}
          actions={(r) => {
            // me 미로딩(maxPriority undefined)이면 우선순위 판정을 보류하고 시스템 역할만 비활성 — 서버가 최종 방어(403).
            const editable = maxPriority === undefined ? !r.isSystem : canManageRole(r, maxPriority);
            const reason = r.isSystem ? "시스템 역할은 변경할 수 없습니다" : "내 등급보다 높은 역할입니다";
            const actionCls = "px-2 py-1 hover:bg-surface-soft"; // 호버 시 배경 틴트로 인터랙션 명시(비활성은 pointer-events-none)
            return (
              <div className="flex justify-end gap-xs">
                <Button type="button" variant="tertiary" className={actionCls} disabled={!editable} title={editable ? undefined : reason} aria-label={`${r.name} 수정`} onClick={() => setEditTarget(r)}>수정</Button>
                <Button type="button" variant="tertiary" className={actionCls} disabled={!editable} title={editable ? undefined : reason} aria-label={`${r.name} 권한`} onClick={() => setPermTarget(r)}>권한</Button>
                <Button type="button" variant="tertiary" className={actionCls} disabled={!editable} title={editable ? undefined : reason} aria-label={`${r.name} 삭제`} onClick={() => setDeleteTarget(r)}>삭제</Button>
              </div>
            );
          }}
        />
      </div>

      <RoleFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      <RoleFormDialog
        open={editTarget != null}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        mode="edit"
        initial={editTarget ?? undefined}
      />
      {permTarget ? (
        <RolePermissionsDialog
          key={permTarget.id}
          open
          onOpenChange={(v) => { if (!v) setPermTarget(null); }}
          role={permTarget}
        />
      ) : null}
      <DeleteConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title={deleteTarget ? `'${deleteTarget.name}' 역할을 삭제할까요?` : "역할을 삭제할까요?"}
        warning="이 역할을 삭제합니다. 되돌릴 수 없습니다. 회원에게 할당된 역할은 삭제할 수 없습니다."
        pending={remove.isPending}
        onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id); }}
      />
    </>
  );
}
