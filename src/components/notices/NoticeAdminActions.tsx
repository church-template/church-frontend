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
import { patchNotice, deleteNotice } from "@/lib/api/notices";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";

// ISR 반영 지연 안내: 삭제·생성은 공개 페이지에 최대 1분 후 반영(revalidate 60).
const DELAY_NOTICE = "공개 페이지 반영은 최대 1분 걸릴 수 있습니다.";

// 공지 목록 toolbar 액션: NOTICE_WRITE 권한 보유자에게만 '새 공지' 링크 노출.
export function NoticeListAction() {
  return (
    <RequirePermission permission="NOTICE_WRITE">
      <Link href="/notices/new" className={buttonVariants("primary")}>새 공지</Link>
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
    onSuccess: () => router.refresh(),
  });
  const remove = useMutation({
    mutationFn: () => deleteNotice(id),
    onError: adminOnError(),
    onSuccess: () => {
      notify.success(`삭제했습니다. ${DELAY_NOTICE}`);
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
        <Link href={`/notices/${id}/edit`} className={buttonVariants("secondary")}>수정</Link>
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>삭제</Button>
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
