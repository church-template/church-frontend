"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/common/Skeleton";
import { EventDetailView } from "./EventDetailView";
import { EventDetailActions } from "./EventAdminActions";
import { apiUrl } from "@/lib/auth/apiBase";
import { notify } from "@/lib/notify";
import type { EventCardResponse, EventDetailResponse } from "@/lib/api/types";

// 칩 클릭 → 카드 데이터로 제목 즉시 표시 + description은 클라 fetch(공개 단건, 인증 불필요).
// NEXT_PUBLIC_API_BASE가 클라 번들에 인라인돼야 도달(미설정 시 동일 오리진 404, 운영 env 필수).
export function EventDetailModal({
  event,
  onClose,
}: {
  event: EventCardResponse | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<EventDetailResponse | null>(null);

  useEffect(() => {
    if (!event) return;
    let alive = true;
    fetch(apiUrl(`/api/events/${event.id}`))
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<EventDetailResponse>;
      })
      .then((d) => {
        if (alive) setDetail(d);
      })
      .catch(() => {
        if (alive) notify.error("일정을 불러오지 못했습니다.");
      });
    return () => {
      alive = false;
    };
  }, [event]);

  // 동기 setState(effect) 없이 표시 여부를 파생 — 이전 이벤트 데이터가 남아도 id 불일치면 Skeleton.
  const shown = detail && event && detail.id === event.id ? detail : null;

  return (
    <Dialog
      open={event != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {event ? (
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>{event.title}</DialogTitle>
          {shown ? (
            <>
              <EventDetailView event={shown} />
              {/* onClose: 수정·삭제 완료 후 모달을 닫는다 — 옛 데이터가 열린 채 남지 않도록. */}
              <EventDetailActions event={shown} onClose={onClose} />
            </>
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
