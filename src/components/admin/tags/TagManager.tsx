"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { getTags } from "@/lib/api/tags";
import { deleteTag } from "@/lib/api/tags.admin";
import { revalidateTags } from "@/lib/admin/revalidate";
import type { TagResponse } from "@/lib/api/types";
import { TagFormDialog } from "./TagFormDialog";

export function TagManager() {
  const qc = useQueryClient();
  // ["tags"] 키 공유 — TagMultiSelect·갤러리 필터와 동일 키라 invalidate 시 함께 갱신.
  const { data: tags = [], isLoading, isError, error } = useQuery({ queryKey: ["tags"], queryFn: getTags });

  // 목록 조회 실패는 토스트로 알린다(빈 목록과 혼동 방지). notify 호출이라 effect 내 setState 아님.
  useEffect(() => {
    if (isError) adminOnError()(error);
  }, [isError, error]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TagResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagResponse | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => deleteTag(id),
    onError: adminOnError(),
    onSuccess: async () => {
      await revalidateTags();
      qc.invalidateQueries({ queryKey: ["tags"] });
      notify.success("삭제했습니다.");
      setDeleteTarget(null);
    },
  });

  const columns: Column<TagResponse>[] = [{ key: "name", header: "이름", cell: (t) => t.name }];

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>새 태그</Button>
      </div>
      <div className="mt-base">
        <DataTable
          columns={columns}
          rows={tags}
          rowKey={(t) => t.id}
          loading={isLoading}
          empty={<p className={cn(typo.bodyMd, "text-muted")}>등록된 태그가 없습니다.</p>}
          actions={(t) => (
            <div className="flex justify-end gap-xs">
              <Button type="button" variant="tertiary" aria-label={`${t.name} 수정`} onClick={() => setEditTarget(t)}>수정</Button>
              <Button type="button" variant="tertiary" aria-label={`${t.name} 삭제`} onClick={() => setDeleteTarget(t)}>삭제</Button>
            </div>
          )}
        />
      </div>

      <TagFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      <TagFormDialog
        open={editTarget != null}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        mode="edit"
        initial={editTarget ?? undefined}
      />
      <DeleteConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title={deleteTarget ? `'${deleteTarget.name}' 태그를 삭제할까요?` : "태그를 삭제할까요?"}
        warning="이 태그를 삭제하면 연결된 설교·공지·일정·부서에서도 태그가 함께 제거됩니다."
        pending={remove.isPending}
        onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id); }}
      />
    </>
  );
}
