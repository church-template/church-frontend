"use client";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { EventChip } from "./EventChip";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import type { EventCardResponse } from "@/lib/api/types";

// 셀에 표시되는 칩 수(EventCalendar와 동일). 초과분이 "+n"으로 접힌다(가이드 15.3).
const SHOWN_PER_CELL = 3;

// "+n" 트리거 → 그 날짜 전체 이벤트 칩 목록. ESC·외부클릭·포커스복귀는 Radix(15.2).
export function EventDayPopover({
  events,
  onSelect,
}: {
  events: EventCardResponse[];
  onSelect: (event: EventCardResponse) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          typo.caption,
          "block rounded-sm px-2 py-0.5 text-left text-muted hover:text-ink",
          "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary",
        )}
      >
        {`+${events.length - SHOWN_PER_CELL}`}
      </PopoverTrigger>
      <PopoverContent className="w-56">
        <div className="flex flex-col gap-xs">
          {events.map((e) => (
            <EventChip key={e.id} event={e} onSelect={onSelect} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
