// src/components/sermons/SermonAdminActions.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Button, buttonVariants } from "@/components/ui/Button";
import { ACTION, CREATE_ICON } from "@/constants/actionButton";
import { deleteSermon } from "@/lib/api/sermons.admin";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";

// 설교 목록 toolbar 액션: SERMON_WRITE 권한 보유자에게만 '새 설교' 링크 노출.
// RequirePermission이 useMe 라이브 권한으로 게이팅 — 보안 경계는 서버 /api/admin/*.
export function SermonListAction() {
  return (
    <RequirePermission permission="SERMON_WRITE">
      <Link href="/sermons/new" className={buttonVariants("primary")}>
        <CREATE_ICON size={18} aria-hidden />
        새 설교
      </Link>
    </RequirePermission>
  );
}

// 설교 상세 액션: 수정 링크 + 삭제 버튼(확인 모달 경유).
// 삭제는 DELETE라 낙관락 version 불필요(YAGNI). 공지 고정 토글만 PATCH + version 필요(Task 12).
export function SermonDetailActions({ id }: { id: number }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const remove = useMutation({
    mutationFn: () => deleteSermon(id),
    onError: adminOnError(),
    onSuccess: () => {
      // 삭제 즉시 회원 쿼리 캐시 무효화 → 목록이 fresh 데이터를 받음(회원전용 전환으로 ISR 태그 아님).
      qc.invalidateQueries({ queryKey: ["sermons"] });
      notify.success("삭제했습니다.");
      setOpen(false);
      router.push("/sermons");
    },
  });
  return (
    <RequirePermission permission="SERMON_WRITE">
      <div className="flex gap-sm">
        <Link href={`/sermons/${id}/edit`} className={buttonVariants("tertiary")} aria-label="설교 수정">
          <ACTION.edit.Icon size={18} aria-hidden />
          <span className="hidden lg:inline">{ACTION.edit.label}</span>
        </Link>
        <Button type="button" variant="tertiary" aria-label="설교 삭제" onClick={() => setOpen(true)}>
          <ACTION.delete.Icon size={18} aria-hidden />
          <span className="hidden lg:inline">{ACTION.delete.label}</span>
        </Button>
      </div>
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="설교를 삭제할까요?"
        warning="삭제하면 공개 목록에서 사라집니다."
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </RequirePermission>
  );
}
