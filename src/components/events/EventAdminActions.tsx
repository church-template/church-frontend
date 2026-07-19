// src/components/events/EventAdminActions.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Button, buttonVariants } from "@/components/ui/Button";
import { ACTION, CREATE_ICON } from "@/constants/actionButton";
import { deleteEvent } from "@/lib/api/events.admin";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { revalidateEvents } from "@/lib/admin/revalidate";
import type { EventDetailResponse } from "@/lib/api/types";

// ISR 공개 페이지 위 client island — 일정 목록 toolbar의 "새 일정" 진입 링크.
// RequirePermission이 EVENT_WRITE 미보유 시 null 반환(UX 게이트).
export function EventListAction() {
  return (
    <RequirePermission permission="EVENT_WRITE">
      <Link href="/events/new" className={buttonVariants("primary")}>
        <CREATE_ICON size={18} aria-hidden />
        새 일정
      </Link>
    </RequirePermission>
  );
}

// 일정 상세(캘린더 모달·딥링크 페이지) 위 수정/삭제 액션 island.
// 수정은 전용 페이지(/events/[id]/edit) 링크 — 라우트 전환으로 부모 모달이 자연 해소된다.
// onClose: 삭제 성공 후 호출하는 콜백 — 캘린더 모달 닫기 등 부모 정리에 쓴다.
export function EventDetailActions({ event, onClose }: { event: EventDetailResponse; onClose?: () => void }) {
  const router = useRouter();
  const [delOpen, setDelOpen] = useState(false);

  const remove = useMutation({
    mutationFn: () => deleteEvent(event.id),
    onError: adminOnError(),
    onSuccess: async () => {
      // updateTag 서버 액션으로 events 캐시 즉시 무효화 후 모달 닫기·부모 콜백·새로고침.
      await revalidateEvents();
      notify.success("삭제했습니다.");
      setDelOpen(false);
      onClose?.();
      router.refresh();
    },
  });

  return (
    <RequirePermission permission="EVENT_WRITE">
      <div className="flex gap-sm">
        <Link href={`/events/${event.id}/edit`} aria-label="일정 수정" className={buttonVariants("tertiary")}>
          <ACTION.edit.Icon size={18} aria-hidden />
          <span className="hidden lg:inline">{ACTION.edit.label}</span>
        </Link>
        <Button type="button" variant="tertiary" aria-label="일정 삭제" onClick={() => setDelOpen(true)}>
          <ACTION.delete.Icon size={18} aria-hidden />
          <span className="hidden lg:inline">{ACTION.delete.label}</span>
        </Button>
      </div>
      <DeleteConfirmDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title="일정을 삭제할까요?"
        warning="삭제하면 공개 캘린더에서 사라집니다."
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </RequirePermission>
  );
}
