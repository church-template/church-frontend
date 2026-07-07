"use client";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { ACTION, CREATE_ICON } from "@/constants/actionButton";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { ApiError } from "@/lib/auth/apiError";
import { formatDate } from "@/lib/date";
import { formatRange } from "@/constants/bible";
import { deleteChallenge } from "@/lib/api/challenges.admin";
import { useChallenges } from "@/components/challenges/queries";
import { STATUS_LABELS } from "@/components/challenges/ChallengeDetail";
import type { ChallengeCardResponse } from "@/lib/api/types";
import { ChallengeFormDialog } from "./ChallengeFormDialog";

// 어드민 전용 GET 없음 — 회원 목록(["challenges"] 키) 재사용(태그 관리자의 getTags 선례, 스펙 §3).
export function ChallengeManager() {
  const qc = useQueryClient();
  const list = useChallenges({ page: 0 });

  // CHALLENGE_MANAGE만 있고 CHALLENGE_PARTICIPATE 없는 계정의 403 안내(스펙 §7 어드민 엣지).
  // 분기는 errorCode로만(status·title 금지 — 프로젝트 계약, 가이드 4장).
  const forbidden = list.isError && list.error instanceof ApiError && list.error.errorCode === "ACCESS_DENIED";
  useEffect(() => {
    if (list.isError && !forbidden) adminOnError()(list.error);
  }, [list.isError, forbidden, list.error]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ChallengeCardResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChallengeCardResponse | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => deleteChallenge(id),
    onError: adminOnError(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenges"] });
      notify.success("삭제했습니다.");
      setDeleteTarget(null);
    },
  });

  if (forbidden) {
    return (
      <p className={cn(typo.bodyMd, "text-muted")}>
        목록 조회에는 통독 챌린지 참여 권한도 필요합니다. 역할 관리에서 CHALLENGE_PARTICIPATE 권한을 확인해 주세요.
      </p>
    );
  }

  const columns: Column<ChallengeCardResponse>[] = [
    { key: "title", header: "제목", cell: (c) => c.title },
    { key: "range", header: "범위", cell: (c) => formatRange(c.startBook, c.endBook) },
    { key: "period", header: "기간", cell: (c) => `${formatDate(c.startDate)} ~ ${formatDate(c.endDate)}` },
    { key: "targetDays", header: "목표 일수", cell: (c) => `${c.targetDays}일` },
    { key: "status", header: "상태", cell: (c) => STATUS_LABELS[c.status] },
  ];

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
          <CREATE_ICON size={18} aria-hidden />
          새 챌린지
        </Button>
      </div>
      <div className="mt-base">
        <DataTable
          columns={columns}
          rows={list.data?.content ?? []}
          rowKey={(c) => c.id}
          loading={list.isPending}
          empty={<p className={cn(typo.bodyMd, "text-muted")}>등록된 챌린지가 없습니다.</p>}
          actions={(c) => (
            <div className="flex justify-end gap-xs">
              <Button type="button" variant="tertiary" aria-label={`${c.title} 수정`} onClick={() => setEditTarget(c)}>
                <ACTION.edit.Icon size={18} aria-hidden />
                <span className="hidden lg:inline">{ACTION.edit.label}</span>
              </Button>
              <Button type="button" variant="tertiary" aria-label={`${c.title} 삭제`} onClick={() => setDeleteTarget(c)}>
                <ACTION.delete.Icon size={18} aria-hidden />
                <span className="hidden lg:inline">{ACTION.delete.label}</span>
              </Button>
            </div>
          )}
        />
      </div>

      <ChallengeFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      <ChallengeFormDialog
        open={editTarget != null}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        mode="edit"
        editId={editTarget?.id}
      />
      <DeleteConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title={deleteTarget ? `'${deleteTarget.title}' 챌린지를 삭제할까요?` : "챌린지를 삭제할까요?"}
        warning="삭제하면 교인들의 참여 기록도 함께 숨겨집니다."
        pending={remove.isPending}
        onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id); }}
      />
    </>
  );
}
