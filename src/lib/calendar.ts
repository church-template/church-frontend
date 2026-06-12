// KST 민간-날짜(y,m,d) 기반 캘린더 코어 — 순수 함수. date-fns 미사용:
// date-fns 캘린더 함수는 런타임 로컬 TZ 기준이라 서버 컴포넌트(UTC)에서 날짜 경계가 어긋난다.
// 셀 판정은 Date.UTC(요일·격자 산술) + Intl Asia/Seoul(인스턴트→KST 벽시계)만 쓴다(스펙 §5·§9).
import { parseServerDate } from "@/lib/date";
import type { EventCardResponse } from "@/lib/api/types";

export interface CivilDate {
  y: number;
  m: number; // 1–12
  d: number;
}
export const civilKey = (c: CivilDate): number => c.y * 10000 + c.m * 100 + c.d;

// en-CA → "YYYY-MM-DD". 호출 전 반드시 유효 Date(getTime 비 NaN) 보장(Intl은 Invalid Date에 throw).
const kstYmd = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function kstCivilFromDate(date: Date): CivilDate {
  const [y, m, d] = kstYmd.format(date).split("-").map(Number);
  return { y, m, d };
}
export const kstCivil = (iso: string): CivilDate => kstCivilFromDate(parseServerDate(iso));

// 0=일 … 6=토. UTC 고정이라 런타임 TZ 무관.
export const civilWeekday = (c: CivilDate): number =>
  new Date(Date.UTC(c.y, c.m - 1, c.d)).getUTCDay();

export interface Cell {
  civil: CivilDate;
  inMonth: boolean;
}

// 일요일 시작 격자. 4·5·6행 가변(데이터 구동). Date.UTC로만 산술 → 모든 런타임 동일.
export function monthMatrix(year: number, month: number): Cell[][] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weeks = Math.ceil((firstWeekday + daysInMonth) / 7);
  const rows: Cell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const row: Cell[] = [];
    for (let day = 0; day < 7; day++) {
      const dt = new Date(Date.UTC(year, month - 1, 1 - firstWeekday + (w * 7 + day)));
      const civil = { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
      row.push({ civil, inMonth: civil.y === year && civil.m === month });
    }
    rows.push(row);
  }
  return rows;
}

const DAY_MS = 86_400_000;

// 각 이벤트가 점유하는 모든 KST 날짜에 배치(end_at 배타 균일 적용, 스펙 §5.3).
export function bucketEvents(events: EventCardResponse[]): Map<number, EventCardResponse[]> {
  const map = new Map<number, EventCardResponse[]>();
  const push = (key: number, e: EventCardResponse) => {
    const arr = map.get(key);
    if (arr) arr.push(e);
    else map.set(key, [e]);
  };
  for (const e of events) {
    const start = parseServerDate(e.startAt);
    if (Number.isNaN(start.getTime())) continue; // NaN 가드(§13 A3)
    const startC = kstCivilFromDate(start);
    if (e.endAt == null) {
      push(civilKey(startC), e); // 점 이벤트
      continue;
    }
    const end = parseServerDate(e.endAt);
    if (Number.isNaN(end.getTime())) {
      push(civilKey(startC), e);
      continue;
    }
    const lastC = kstCivilFromDate(new Date(end.getTime() - 1)); // 종료 1ms 전 = 포함 마지막 날
    if (civilKey(lastC) <= civilKey(startC)) {
      push(civilKey(startC), e); // 배타로 같은 날 / 퇴화(end≤start)
      continue;
    }
    let cur = Date.UTC(startC.y, startC.m - 1, startC.d);
    const stop = Date.UTC(lastC.y, lastC.m - 1, lastC.d);
    while (cur <= stop) {
      const dt = new Date(cur);
      push(civilKey({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }), e);
      cur += DAY_MS;
    }
  }
  return map;
}

export interface DayCell extends Cell {
  events: EventCardResponse[];
}
export interface DayGroup {
  civil: CivilDate;
  weekday: number;
  events: EventCardResponse[];
}
export interface CalendarModel {
  year: number;
  month: number;
  today: CivilDate;
  weeks: DayCell[][];
  dayGroups: DayGroup[]; // 모바일: in-month & 이벤트 有, 오름차순
}

export function buildCalendarModel(args: {
  year: number;
  month: number;
  today: CivilDate;
  events: EventCardResponse[];
}): CalendarModel {
  const { year, month, today, events } = args;
  const buckets = bucketEvents(events);
  const weeks: DayCell[][] = monthMatrix(year, month).map((row) =>
    row.map((cell) => ({ ...cell, events: buckets.get(civilKey(cell.civil)) ?? [] })),
  );
  const dayGroups: DayGroup[] = weeks
    .flat()
    .filter((c) => c.inMonth && c.events.length > 0)
    .map((c) => ({ civil: c.civil, weekday: civilWeekday(c.civil), events: c.events }));
  return { year, month, today, weeks, dayGroups };
}

// 누락/반쪽/비정상 month → 현재 KST 월 폴백(400 차단, 스펙 §8.1).
export function resolveMonth(
  raw: { year?: number; month?: number },
  now: Date,
): { year: number; month: number } {
  const { year, month } = raw;
  if (
    year != null &&
    month != null &&
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
  ) {
    return { year, month };
  }
  const c = kstCivilFromDate(now);
  return { year: c.y, month: c.m };
}

// all-day 범위 라벨 — lastC(포함 마지막 날) 파생, 버킷과 일치(스펙 §6). 단일일이면 null.
export function formatAllDayRange(startAt: string, endAt: string | null): string | null {
  if (!endAt) return null;
  const start = parseServerDate(startAt);
  const end = parseServerDate(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const startC = kstCivilFromDate(start);
  const lastC = kstCivilFromDate(new Date(end.getTime() - 1));
  if (civilKey(lastC) <= civilKey(startC)) return null;
  return `~ ${lastC.m}. ${lastC.d}.`;
}
