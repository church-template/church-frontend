"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { civilKey, formatAllDayRange, type CalendarModel, type CivilDate } from "@/lib/calendar";
import { formatEventTime } from "@/lib/date";
import { EventChip } from "./EventChip";
import { EventDayPopover } from "./EventDayPopover";
import { EventDetailModal } from "./EventDetailModal";
import { EventCard } from "@/components/cards/EventCard";
import { EmptyState } from "@/components/common/EmptyState";
import type { EventCardResponse } from "@/lib/api/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_CHIPS = 3;

const navIcon = cn(
  "inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink",
  "hover:bg-surface-strong",
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
);

export function EventCalendar({ model, tagId }: { model: CalendarModel; tagId?: number }) {
  const [selected, setSelected] = useState<EventCardResponse | null>(null);
  const { year, month, today, weeks, dayGroups } = model;

  const hrefFor = (y: number, m: number) => {
    const sp = new URLSearchParams();
    sp.set("year", String(y));
    sp.set("month", String(m));
    if (tagId != null) sp.set("tagId", String(tagId));
    return `/events?${sp.toString()}`;
  };
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const isToday = (c: CivilDate) => civilKey(c) === civilKey(today);

  return (
    <div>
      {/* 헤더: 월 네비 + 오늘 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-xs">
          <Link href={hrefFor(prev.y, prev.m)} aria-label="이전 달" className={navIcon}>
            <ChevronLeft size={20} aria-hidden />
          </Link>
          {/* 모바일은 30px가 행 폭을 넘겨 "7\n월"로 꺾인다 — titleMd(22px)로 낮추고 nowrap. */}
          <h2 className={cn(typo.titleMd, "sm:text-title-lg", "whitespace-nowrap text-ink")}>
            {`${year}년 ${month}월`}
          </h2>
          <Link href={hrefFor(next.y, next.m)} aria-label="다음 달" className={navIcon}>
            <ChevronRight size={20} aria-hidden />
          </Link>
        </div>
        <Link
          href={hrefFor(today.y, today.m)}
          className={cn(
            typo.button,
            "inline-flex h-10 items-center rounded-lg bg-surface-strong px-4 text-ink hover:bg-hairline whitespace-nowrap",
            "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          )}
        >
          오늘
        </Link>
      </div>

      {/* 데스크톱 그리드 */}
      <div data-testid="calendar-grid" className="mt-lg hidden lg:block">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((w) => (
            <div key={w} className={cn(typo.caption, "py-2 text-center text-muted")}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-t border-hairline">
          {weeks.flat().map((cell) => {
            const shown = cell.events.slice(0, MAX_CHIPS);
            return (
              <div
                key={civilKey(cell.civil)}
                className="min-h-24 border-r border-b border-hairline p-1"
              >
                <div className="flex justify-end">
                  <span
                    className={cn(
                      typo.datetime,
                      "inline-flex h-7 w-7 items-center justify-center rounded-full",
                      isToday(cell.civil)
                        ? "bg-primary-soft text-primary"
                        : cell.inMonth
                          ? "text-ink"
                          : "text-muted-soft",
                    )}
                  >
                    {cell.civil.d}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-col gap-0.5">
                  {shown.map((e) => (
                    <EventChip key={e.id} event={e} onSelect={setSelected} />
                  ))}
                  {cell.events.length > MAX_CHIPS ? (
                    <EventDayPopover events={cell.events} onSelect={setSelected} />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 모바일 목록 */}
      <div data-testid="calendar-list" className="mt-lg lg:hidden">
        {dayGroups.length === 0 ? (
          <EmptyState message="등록된 일정이 없습니다." />
        ) : (
          <div className="flex flex-col gap-lg">
            {dayGroups.map((g) => (
              <div key={civilKey(g.civil)}>
                <h3 className={cn(typo.datetime, "text-ink")}>
                  {`${g.civil.m}월 ${g.civil.d}일 (${WEEKDAYS[g.weekday]})`}
                </h3>
                <div className="mt-xs flex flex-col gap-xs">
                  {g.events.map((e) => {
                    const time = e.allDay
                      ? formatAllDayRange(e.startAt, e.endAt ?? null)
                      : formatEventTime(e.startAt, e.endAt, e.allDay);
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setSelected(e)}
                        className="block w-full text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                      >
                        <EventCard title={e.title} time={time} location={e.location} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EventDetailModal event={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
