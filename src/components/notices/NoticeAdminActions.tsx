// src/components/notices/NoticeAdminActions.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ACTION, CREATE_ICON } from "@/constants/actionButton";
import { patchNotice, deleteNotice } from "@/lib/api/notices.admin";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { revalidateNotices } from "@/lib/admin/revalidate";

// 공지 목록 toolbar 액션: NOTICE_WRITE 권한 보유자에게만 '새 공지' 링크 노출.
export function NoticeListAction() {
  return (
    <RequirePermission permission="NOTICE_WRITE">
      <Link href="/notices/new" className={buttonVariants("primary")}>
        <CREATE_ICON size={18} aria-hidden />
        새 공지
      </Link>
    </RequirePermission>
  );
}

// 공지 상세 액션: 고정 토글 + 수정 링크 + 삭제 버튼.
// 고정 토글은 PATCH라 낙관락 version 필요 — 설교 삭제(DELETE, YAGNI)와 달리 props에 포함.
export function NoticeDetailActions({
  id, version, isPinned,
}: {
  id: number; version: number; isPinned: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const pin = useMutation({
    mutationFn: () => patchNotice(id, { version, isPinned: !isPinned }),
    onError: adminOnError({ onReedit: () => router.refresh() }),
    // 고정 토글도 공개 목록 반영 대상 — 즉시 무효화 후 라우터 갱신.
    onSuccess: async () => { await revalidateNotices(); router.refresh(); },
  });
  const remove = useMutation({
    mutationFn: () => deleteNotice(id),
    onError: adminOnError(),
    onSuccess: async () => {
      // 공지 삭제 후 공개 ISR 캐시 즉시 무효화.
      await revalidateNotices();
      notify.success("삭제했습니다.");
      setOpen(false);
      router.push("/notices");
    },
  });

  return (
    <RequirePermission permission="NOTICE_WRITE">
      <div className="flex flex-wrap items-center gap-base">
        <Checkbox
          label="상단 고정"
          checked={isPinned}
          disabled={pin.isPending}
          onChange={() => pin.mutate()}
        />
        <Link href={`/notices/${id}/edit`} className={buttonVariants("tertiary")} aria-label="공지 수정">
          <ACTION.edit.Icon size={18} aria-hidden />
          <span className="hidden lg:inline">{ACTION.edit.label}</span>
        </Link>
        <Button type="button" variant="tertiary" aria-label="공지 삭제" onClick={() => setOpen(true)}>
          <ACTION.delete.Icon size={18} aria-hidden />
          <span className="hidden lg:inline">{ACTION.delete.label}</span>
        </Button>
      </div>
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="공지를 삭제할까요?"
        warning="삭제하면 공개 목록에서 사라집니다."
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </RequirePermission>
  );
}
