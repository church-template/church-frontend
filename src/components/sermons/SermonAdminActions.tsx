// src/components/sermons/SermonAdminActions.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Button, buttonVariants } from "@/components/ui/Button";
import { deleteSermon } from "@/lib/api/sermons.admin";
import { revalidateSermons } from "@/lib/admin/revalidate";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";

// 설교 목록 toolbar 액션: SERMON_WRITE 권한 보유자에게만 '새 설교' 링크 노출.
// RequirePermission이 useMe 라이브 권한으로 게이팅 — 보안 경계는 서버 /api/admin/*.
export function SermonListAction() {
  return (
    <RequirePermission permission="SERMON_WRITE">
      <Link href="/sermons/new" className={buttonVariants("primary")}>새 설교</Link>
    </RequirePermission>
  );
}

// 설교 상세 액션: 수정 링크 + 삭제 버튼(확인 모달 경유).
// 삭제는 DELETE라 낙관락 version 불필요(YAGNI). 공지 고정 토글만 PATCH + version 필요(Task 12).
export function SermonDetailActions({ id }: { id: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const remove = useMutation({
    mutationFn: () => deleteSermon(id),
    onError: adminOnError(),
    onSuccess: async () => {
      // 삭제 즉시 sermons 태그 캐시 무효화 → 다음 공개 목록 요청이 fresh 데이터를 받음.
      await revalidateSermons();
      notify.success("삭제했습니다.");
      setOpen(false);
      router.push("/sermons");
    },
  });
  return (
    <RequirePermission permission="SERMON_WRITE">
      <div className="flex gap-sm">
        <Link href={`/sermons/${id}/edit`} className={buttonVariants("secondary")}>수정</Link>
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>삭제</Button>
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
