"use client";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { monthMatrix, kstCivilFromDate, civilKey, type CivilDate } from "@/lib/calendar";
import type { ReadingLogResponse } from "@/lib/api/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface ReadingCalendarProps {
  startDate: string; // 챌린지 시작일 "YYYY-MM-DD" — 활성 하한·월 이동 하한
  endDate: string;
  logs: ReadingLogResponse[];
  year: number;
  month: number; // 1~12
  onMonthChange: (year: number, month: number) => void;
  onSelectDay: (date: string, existing: number | null) => void; // 달력 탭 = 기록/취소 입구(스펙 §4)
}

const toCivil = (ymd: string): CivilDate => {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d };
};
const toYmd = (c: CivilDate): string =>
  `${c.y}-${String(c.m).padStart(2, "0")}-${String(c.d).padStart(2, "0")}`;

// reading-calendar(DESIGN.md): 벽걸이 달력식 — 읽은 날 primary-soft 채움+✓, 오늘 primary 테두리.
export function ReadingCalendar({ startDate, logs, year, month, onMonthChange, onSelectDay }: ReadingCalendarProps) {
  const today = kstCivilFromDate(new Date());
  const startKey = civilKey(toCivil(startDate));
  const todayKey = civilKey(today);
  const byDate = new Map(logs.map((l) => [l.readDate, l.chapters]));

  const startYm = startDate.slice(0, 7);
  const currentYm = `${year}-${String(month).padStart(2, "0")}`;
  const todayYm = toYmd(today).slice(0, 7);
  const canPrev = currentYm > startYm;
  const canNext = currentYm < todayYm;
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  return (
    <section className="rounded-xl border border-hairline p-xl">
      <div className="flex items-center justify-between">
        <h2 className={cn(typo.titleSm, "text-ink")}>읽기 달력</h2>
        <div className="flex items-center gap-xs">
          <button type="button" aria-label="이전 달" disabled={!canPrev} onClick={() => onMonthChange(prev.y, prev.m)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-surface-strong disabled:opacity-40">
            <ChevronLeft size={20} aria-hidden />
          </button>
          <span className={cn(typo.datetime, "text-ink")}>{`${year}년 ${month}월`}</span>
          <button type="button" aria-label="다음 달" disabled={!canNext} onClick={() => onMonthChange(next.y, next.m)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-surface-strong disabled:opacity-40">
            <ChevronRight size={20} aria-hidden />
          </button>
        </div>
      </div>

      <div className="mt-md grid grid-cols-7">
        {WEEKDAYS.map((w) => (
          <div key={w} className={cn(typo.caption, "py-1 text-center text-muted")}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {monthMatrix(year, month).flat().map((cell) => {
          const key = civilKey(cell.civil);
          const ymd = toYmd(cell.civil);
          const chapters = byDate.get(ymd) ?? null;
          const inRange = key >= startKey && key <= todayKey; // [시작일, 오늘]만 기록 가능(스펙 §4)
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              disabled={!inRange || !cell.inMonth}
              onClick={() => onSelectDay(ymd, chapters)}
              aria-label={`${cell.civil.m}월 ${cell.civil.d}일 · ${chapters != null ? `${chapters}장 읽음` : "기록 없음"}`}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-sm border",
                chapters != null ? "border-primary-soft bg-primary-soft" : "border-hairline-soft",
                isToday && "border-2 border-primary",
                !cell.inMonth && "invisible",
                inRange && cell.inMonth ? "cursor-pointer hover:border-primary" : "opacity-40",
              )}
            >
              <span className={cn(typo.caption, isToday ? "font-semibold text-primary" : "text-body")}>{cell.civil.d}</span>
              {chapters != null ? <Check size={14} className="text-primary" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
