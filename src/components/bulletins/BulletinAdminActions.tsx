// src/components/bulletins/BulletinAdminActions.tsx
"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { revalidateBulletins } from "@/lib/admin/revalidate";
import { deleteBulletin } from "@/lib/api/bulletins.admin";
import type { BulletinCardResponse } from "@/lib/api/types";
import { ACTION, CREATE_ICON } from "@/constants/actionButton";
import { BulletinFormDialog } from "./BulletinFormDialog";

// 목록 toolbar 등록 버튼.
export function BulletinListAction() {
  const [open, setOpen] = useState(false);
  return (
    <RequirePermission permission="BULLETIN_WRITE">
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        <CREATE_ICON size={18} aria-hidden />
        새 주보
      </Button>
      <BulletinFormDialog open={open} onOpenChange={setOpen} mode="create" />
    </RequirePermission>
  );
}

// 행 액션(앵커 밖 형제). 수정=FormDialog(edit), 삭제=확인 다이얼로그.
export function BulletinRowActions({ b }: { b: BulletinCardResponse }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const remove = useMutation({
    mutationFn: () => deleteBulletin(b.id),
    onError: adminOnError(),
    onSuccess: async () => {
      await revalidateBulletins();
      notify.success("삭제했습니다.");
      setDelOpen(false);
      router.refresh();
    },
  });
  return (
    <RequirePermission permission="BULLETIN_WRITE">
      <div className="flex shrink-0 gap-xs">
        <Button type="button" variant="tertiary" aria-label="주보 수정" onClick={() => setEditOpen(true)}>
          <ACTION.edit.Icon size={18} aria-hidden />
          <span className="hidden lg:inline">{ACTION.edit.label}</span>
        </Button>
        <Button type="button" variant="tertiary" aria-label="주보 삭제" onClick={() => setDelOpen(true)}>
          <ACTION.delete.Icon size={18} aria-hidden />
          <span className="hidden lg:inline">{ACTION.delete.label}</span>
        </Button>
      </div>
      <BulletinFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" bulletinId={b.id} />
      <DeleteConfirmDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title="주보를 삭제할까요?"
        warning="삭제하면 공개 목록에서 사라집니다.(PDF 원본은 라이브러리에 보존)"
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </RequirePermission>
  );
}
