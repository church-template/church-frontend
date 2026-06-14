// src/components/events/EventAdminActions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Button } from "@/components/ui/Button";
import { EventFormDialog } from "./EventFormDialog";
import { deleteEvent } from "@/lib/api/events.admin";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { revalidateEvents } from "@/lib/admin/revalidate";
import type { EventDetailResponse } from "@/lib/api/types";

// ISR 공개 페이지 위 client island — 일정 목록 toolbar의 "새 일정" 버튼.
// RequirePermission이 EVENT_WRITE 미보유 시 null 반환(UX 게이트).
export function EventListAction() {
  const [open, setOpen] = useState(false);
  return (
    <RequirePermission permission="EVENT_WRITE">
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        새 일정
      </Button>
      <EventFormDialog open={open} onOpenChange={setOpen} mode="create" />
    </RequirePermission>
  );
}

// 일정 상세(캘린더 모달·딥링크 페이지) 위 수정/삭제 액션 island.
// event: EventDetailResponse — RSC 레이어에서 받은 상세 응답을 그대로 전달한다.
// onClose: 수정·삭제 성공 후 호출하는 콜백 — 캘린더 모달 닫기 등 부모 정리에 쓴다(수정 시 모달에 옛 데이터가 남지 않도록).
export function EventDetailActions({ event, onClose }: { event: EventDetailResponse; onClose?: () => void }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
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
        <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
          수정
        </Button>
        <Button type="button" variant="secondary" onClick={() => setDelOpen(true)}>
          삭제
        </Button>
      </div>
      <EventFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" initial={event} onSaved={onClose} />
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
