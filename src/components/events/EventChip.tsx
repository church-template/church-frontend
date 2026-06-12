"use client";

import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { formatClockTime } from "@/lib/date";
import type { EventCardResponse } from "@/lib/api/types";

// badge-pill-primary 스타일 버튼. allDay면 시간 생략(검수 ⑤). 1줄 말줄임.
export function EventChip({
  event,
  onSelect,
}: {
  event: EventCardResponse;
  onSelect: (event: EventCardResponse) => void;
}) {
  const time = event.allDay ? null : formatClockTime(event.startAt);
  const label = time ? `${time} ${event.title}` : event.title;
  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      aria-label={label}
      className={cn(
        typo.caption,
        "block w-full truncate rounded-sm bg-primary-soft px-2 py-0.5 text-left text-primary",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary",
      )}
    >
      {label}
    </button>
  );
}
