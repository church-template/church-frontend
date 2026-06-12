# 일정 캘린더 (T12) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 읽기 전용 일정 캘린더(`/events`)를 직접 구현하고, 일정 상세를 모달 + 딥링크(`/events/{id}`)로 연결한다.

**Architecture:** 서버 컴포넌트가 `?year&month&tagId`로 `GET /api/events`를 패칭하고 **KST 민간-날짜**로 격자·버킷을 1회 계산해 직렬화 모델을 클라 `EventCalendar`에 전달한다(런타임 TZ 무관·하이드레이션 안정). 월 이동은 `<Link>`(URL 구동), 데스크톱 그리드↔모바일 목록은 CSS 1024px 토글, 칩 클릭은 클라 Dialog 모달(상세는 클라 fetch). 설계: `docs/superpowers/specs/2026-06-12-event-calendar-design.md`.

**Tech Stack:** Next.js(App Router)·TypeScript·Tailwind·Radix(Dialog/Popover)·vitest+@testing-library. **date-fns 미도입**(셀 계산은 `Date.UTC`+Intl Asia/Seoul 직접 구현 — 스펙 §9).

> **커밋 규칙(프로젝트 CLAUDE.md, 스킬보다 우선):** 커밋·push는 **사용자 명시 요청 시에만**. 각 Task의 마지막 "Commit" 스텝은 사용자가 커밋을 요청할 때 수행하고, 평소엔 RED→GREEN 확인 후 다음 Task로 진행한다.

> **공통 검증 명령:** 단일 테스트 `pnpm vitest run <path>` · 전체 `pnpm test` · 린트 `pnpm lint` · 빌드 `pnpm build`.

---

## 파일 구조 (생성/수정)

| 파일 | 책임 |
|---|---|
| **C** `src/lib/api/events.ts` | `getEvents`/`getEvent`/`buildEventQuery`/`EVENTS_PAGE_SIZE` |
| **M** `src/lib/api/types.ts` | `EventDetailResponse` 추가 |
| **C** `src/lib/calendar.ts` | KST 민간-날짜 격자·버킷·모델·`resolveMonth`·`formatAllDayRange`(순수) |
| **M** `src/lib/date.ts` | `formatClockTime` 추가 |
| **M** `src/components/cards/EventCard.tsx` | `date`를 optional로(없으면 배지 생략) — 모바일 목록 재사용 |
| **C** `src/components/events/EventChip.tsx` | 칩(클릭→모달) |
| **C** `src/components/events/EventDayPopover.tsx` | "+n" 더보기 Popover |
| **C** `src/components/events/EventDetailView.tsx` | 상세 본문(제목 제외; 모달·딥링크 공유) |
| **C** `src/components/events/EventDetailModal.tsx` | Dialog + description 클라 fetch |
| **C** `src/components/events/EventCalendar.tsx` | 그리드+목록+모달 오케스트레이션 |
| **C** `src/app/(site)/events/page.tsx` | 서버: 월 그리드/목록 |
| **C** `src/app/(site)/events/[id]/page.tsx` | 서버: 딥링크 상세 |

(C=Create, M=Modify) — 각 파일은 대응 `*.test.ts(x)` 동반.

---

## Task 1: 일정 API 클라이언트 + 타입

**Files:**
- Create: `src/lib/api/events.ts`
- Modify: `src/lib/api/types.ts` (끝에 추가)
- Test: `src/lib/api/events.test.ts`

- [ ] **Step 1: 실패 테스트 작성** — `src/lib/api/events.test.ts`

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { buildEventQuery, getEvents, getEvent, EVENTS_PAGE_SIZE } from "./events";

afterEach(() => vi.unstubAllGlobals());

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

describe("buildEventQuery", () => {
  it("year·month·size를 항상 함께 직렬화(반쪽 파라미터 없음)", () => {
    expect(buildEventQuery({ year: 2026, month: 6 })).toBe(
      `?year=2026&month=6&size=${EVENTS_PAGE_SIZE}`,
    );
  });
  it("tagId가 있으면 덧붙인다", () => {
    expect(buildEventQuery({ year: 2026, month: 6, tagId: 3 })).toBe(
      `?year=2026&month=6&size=${EVENTS_PAGE_SIZE}&tagId=3`,
    );
  });
});

describe("getEvents", () => {
  it("'/api/events'+쿼리를 revalidate 60으로 호출", async () => {
    const spy = vi.fn(async () => okResponse({ content: [], page: {} }));
    vi.stubGlobal("fetch", spy);
    await getEvents({ year: 2026, month: 6, tagId: 3 });
    expect(spy).toHaveBeenCalledWith(`/api/events?year=2026&month=6&size=${EVENTS_PAGE_SIZE}&tagId=3`, {
      next: { revalidate: 60 },
    });
  });
  it("비 200이면 throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    await expect(getEvents({ year: 2026, month: 6 })).rejects.toThrow("GET /api/events 실패: 500");
  });
});

describe("getEvent", () => {
  it("'/api/events/{id}'를 revalidate 60으로 호출(no-store 아님 — viewCount 없음)", async () => {
    const spy = vi.fn(async () => okResponse({ id: 5 }));
    vi.stubGlobal("fetch", spy);
    await getEvent(5);
    expect(spy).toHaveBeenCalledWith("/api/events/5", { next: { revalidate: 60 } });
  });
  it("404는 null", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 }) as Response));
    expect(await getEvent(99)).toBeNull();
  });
  it("그 외 에러는 throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 }) as Response));
    await expect(getEvent(5)).rejects.toThrow("GET /api/events/5 실패: 503");
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm vitest run src/lib/api/events.test.ts` · Expected: FAIL (`events.ts` 없음).

- [ ] **Step 3: 타입 추가** — `src/lib/api/types.ts` 끝에 추가

```ts
// 일정 상세 — 카드 메타 + description·수정일·낙관적 락(OpenAPI EventDetailResponse).
// 필드 집합은 OpenAPI와 정확히 일치(11개). nullable(?)은 OpenAPI 명시가 아니라
// 도메인 규약(가이드 13.2 점 이벤트·10장 description) + types.ts 관행 기반 해석.
export interface EventDetailResponse {
  id: number;
  title: string;
  description?: string | null; // raw 마크다운 (없을 수 있음)
  location?: string | null;
  startAt: string; // offset 없는 LocalDateTime
  endAt?: string | null; // null = 점(단일 시점) 이벤트
  allDay: boolean;
  createdAt: string;
  updatedAt: string;
  version: number; // 낙관적 락 (표시엔 미사용, 어드민 대비)
  tags: TagResponse[];
}
```

- [ ] **Step 4: 구현** — `src/lib/api/events.ts`

```ts
import { apiUrl } from "@/lib/auth/apiBase";
import type { Page } from "@/lib/page";
import type { EventCardResponse, EventDetailResponse } from "./types";

// 월 단위 단일 페이지 — 백엔드 기본 size=10 잘림 방지(스펙 §4.1). 매직넘버 금지.
export const EVENTS_PAGE_SIZE = 200;

// year·month는 항상 쌍(반쪽 = 400, 가이드 10장). 타입에서 둘 다 필수라 호출부가 어길 수 없다.
export interface EventListParams {
  year: number;
  month: number;
  tagId?: number;
  size?: number;
}

export function buildEventQuery(p: EventListParams): string {
  const sp = new URLSearchParams();
  sp.set("year", String(p.year));
  sp.set("month", String(p.month));
  sp.set("size", String(p.size ?? EVENTS_PAGE_SIZE));
  if (p.tagId != null) sp.set("tagId", String(p.tagId));
  return `?${sp.toString()}`;
}

// 목록(공개) — 캐시 가능(revalidate 60). 서버 컴포넌트 전용. 정렬은 서버 신뢰(startAt asc).
export async function getEvents(p: EventListParams): Promise<Page<EventCardResponse>> {
  const res = await fetch(apiUrl(`/api/events${buildEventQuery(p)}`), {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`GET /api/events 실패: ${res.status}`);
  return (await res.json()) as Page<EventCardResponse>;
}

// 상세(공개) — 일정은 viewCount 부수효과 없음 → 공지와 달리 캐시 가능. 404는 null.
export async function getEvent(id: number): Promise<EventDetailResponse | null> {
  const res = await fetch(apiUrl(`/api/events/${id}`), { next: { revalidate: 60 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /api/events/${id} 실패: ${res.status}`);
  return (await res.json()) as EventDetailResponse;
}
```

- [ ] **Step 5: 통과 확인** — Run: `pnpm vitest run src/lib/api/events.test.ts` · Expected: PASS.

- [ ] **Step 6: Commit** *(사용자 요청 시)*

```bash
git add src/lib/api/events.ts src/lib/api/events.test.ts src/lib/api/types.ts
git commit -m "feat: 일정 API 클라이언트·EventDetailResponse 타입 (T12)"
```

---

## Task 2: KST 캘린더 코어 (`calendar.ts`)

**Files:**
- Create: `src/lib/calendar.ts`
- Test: `src/lib/calendar.test.ts`

- [ ] **Step 1: 실패 테스트 작성** — `src/lib/calendar.test.ts`

```ts
import { describe, it, expect } from "vitest";
import {
  civilKey,
  kstCivil,
  kstCivilFromDate,
  monthMatrix,
  bucketEvents,
  buildCalendarModel,
  resolveMonth,
  formatAllDayRange,
} from "./calendar";
import type { EventCardResponse } from "./api/types";

const ev = (o: Partial<EventCardResponse>): EventCardResponse => ({
  id: 1, title: "t", location: null, startAt: "2026-06-14T10:00:00",
  endAt: null, allDay: false, tags: [], ...o,
});

describe("kstCivil — KST 벽시계 날짜(런타임 TZ 무관)", () => {
  it("offset 없는 datetime의 날짜부를 그대로 반환", () => {
    expect(kstCivil("2026-06-14T23:59:59")).toEqual({ y: 2026, m: 6, d: 14 });
    expect(kstCivil("2026-06-14T00:00:00")).toEqual({ y: 2026, m: 6, d: 14 });
  });
  it("UTC 인스턴트를 Asia/Seoul로 환산(+9h 경계)", () => {
    // 2026-06-14T16:00:00Z = KST 2026-06-15 01:00
    expect(kstCivilFromDate(new Date("2026-06-14T16:00:00Z"))).toEqual({ y: 2026, m: 6, d: 15 });
    // 2026-06-14T14:00:00Z = KST 2026-06-14 23:00
    expect(kstCivilFromDate(new Date("2026-06-14T14:00:00Z"))).toEqual({ y: 2026, m: 6, d: 14 });
  });
});

describe("monthMatrix", () => {
  it("2026-06은 5행, 첫 셀은 이전 달(5/31, inMonth=false)", () => {
    const m = monthMatrix(2026, 6);
    expect(m.length).toBe(5);
    expect(m[0][0]).toEqual({ civil: { y: 2026, m: 5, d: 31 }, inMonth: false });
    expect(m[0][1].civil).toEqual({ y: 2026, m: 6, d: 1 });
  });
  it("일요일 시작 28일 2월(2026-02)은 4행", () => {
    expect(monthMatrix(2026, 2).length).toBe(4);
  });
});

describe("bucketEvents — KST 셀 매핑", () => {
  const has = (m: Map<number, EventCardResponse[]>, y: number, mo: number, d: number) =>
    (m.get(civilKey({ y, m: mo, d })) ?? []).length > 0;

  it("점 이벤트(endAt=null)는 시작일 셀만(검수 ③)", () => {
    const m = bucketEvents([ev({ startAt: "2026-06-14T10:00:00", endAt: null })]);
    expect(has(m, 2026, 6, 14)).toBe(true);
    expect(has(m, 2026, 6, 15)).toBe(false);
  });
  it("end_at 배타 — 종료 자정 다음날 제외(검수 ④)", () => {
    const m = bucketEvents([ev({ startAt: "2026-06-30T00:00:00", endAt: "2026-07-01T00:00:00", allDay: true })]);
    expect(has(m, 2026, 6, 30)).toBe(true);
    expect(has(m, 2026, 7, 1)).toBe(false);
  });
  it("2일 all-day(end=익일 자정)는 시작·종료일 모두, 그 다음날 제외", () => {
    const m = bucketEvents([ev({ startAt: "2026-06-14T00:00:00", endAt: "2026-06-16T00:00:00", allDay: true })]);
    expect(has(m, 2026, 6, 14)).toBe(true);
    expect(has(m, 2026, 6, 15)).toBe(true);
    expect(has(m, 2026, 6, 16)).toBe(false);
  });
  it("OVERLAP — 시작이 이전 달이면 이전 달 셀에도 버킷", () => {
    const m = bucketEvents([ev({ startAt: "2026-05-31T10:00:00", endAt: "2026-06-02T00:00:00", allDay: false })]);
    expect(has(m, 2026, 5, 31)).toBe(true);
    expect(has(m, 2026, 6, 1)).toBe(true);
    expect(has(m, 2026, 6, 2)).toBe(false); // 06-02 00:00 배타
  });
  it("퇴화 end==start는 시작일만(점 이벤트를 end=start로 보낸 경우 방어)", () => {
    const m = bucketEvents([ev({ startAt: "2026-06-14T10:00:00", endAt: "2026-06-14T10:00:00" })]);
    expect(has(m, 2026, 6, 14)).toBe(true);
    expect(m.size).toBe(1);
  });
  it("Invalid 입력(offset 접미사 등)은 버킷 스킵(무음 NaN 차단)", () => {
    const m = bucketEvents([ev({ startAt: "garbage", endAt: null })]);
    expect(m.size).toBe(0);
  });
});

describe("buildCalendarModel", () => {
  it("weeks·dayGroups·today를 직렬화 모델로 반환", () => {
    const model = buildCalendarModel({
      year: 2026, month: 6,
      today: { y: 2026, m: 6, d: 15 },
      events: [ev({ id: 1, startAt: "2026-06-14T10:00:00", endAt: null })],
    });
    expect(model.weeks.length).toBe(5);
    expect(model.today).toEqual({ y: 2026, m: 6, d: 15 });
    // dayGroups: 이벤트 있는 in-month 날만, 오름차순
    expect(model.dayGroups.map((g) => g.civil.d)).toEqual([14]);
    expect(model.dayGroups[0].events[0].id).toBe(1);
  });
});

describe("resolveMonth", () => {
  const now = new Date("2026-03-15T05:00:00Z"); // KST 2026-03-15 14:00
  it("유효한 year+month는 그대로", () => {
    expect(resolveMonth({ year: 2026, month: 6 }, now)).toEqual({ year: 2026, month: 6 });
  });
  it("반쪽/누락/비정상은 현재 KST 월로 폴백(400 차단)", () => {
    expect(resolveMonth({ year: 2026 }, now)).toEqual({ year: 2026, month: 3 });
    expect(resolveMonth({}, now)).toEqual({ year: 2026, month: 3 });
    expect(resolveMonth({ year: 2026, month: 13 }, now)).toEqual({ year: 2026, month: 3 });
  });
});

describe("formatAllDayRange — lastC(포함 마지막 날) 파생", () => {
  it("단일일(end=익일 자정)은 null", () => {
    expect(formatAllDayRange("2026-06-14T00:00:00", "2026-06-15T00:00:00")).toBeNull();
  });
  it("다일은 '~ M. D.'(lastC)", () => {
    expect(formatAllDayRange("2026-06-14T00:00:00", "2026-06-16T00:00:00")).toBe("~ 6. 15.");
  });
  it("endAt 없으면 null", () => {
    expect(formatAllDayRange("2026-06-14T00:00:00", null)).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm vitest run src/lib/calendar.test.ts` · Expected: FAIL (`calendar.ts` 없음).

- [ ] **Step 3: 구현** — `src/lib/calendar.ts`

```ts
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
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm vitest run src/lib/calendar.test.ts` · Expected: PASS (전 케이스).

- [ ] **Step 5: Commit** *(사용자 요청 시)*

```bash
git add src/lib/calendar.ts src/lib/calendar.test.ts
git commit -m "feat: KST 민간-날짜 캘린더 코어(격자·버킷·모델, TZ 안전) (T12)"
```

---

## Task 3: `formatClockTime` (date.ts)

**Files:**
- Modify: `src/lib/date.ts` (끝에 추가)
- Test: `src/lib/date.test.ts` (describe 추가)

- [ ] **Step 1: 실패 테스트 추가** — `src/lib/date.test.ts` 끝에 추가, import에 `formatClockTime` 포함

```ts
// (파일 상단 import 줄을 아래로 교체)
// import { parseServerDate, formatDate, formatEventTime, formatClockTime } from "./date";

describe("formatClockTime", () => {
  it("KST 'HH:mm' 시각만 반환", () => {
    expect(formatClockTime("2026-06-14T10:00:00")).toBe("10:00");
    expect(formatClockTime("2026-06-14T09:05:00")).toBe("09:05");
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm vitest run src/lib/date.test.ts` · Expected: FAIL (`formatClockTime` 없음).

- [ ] **Step 3: 구현** — `src/lib/date.ts` 끝에 추가

```ts
/** 칩·상세의 시각 — KST "HH:mm"(tnum은 호출부 typo.datetime). allDay 분기는 호출부. */
export function formatClockTime(iso: string): string {
  return timeFmt.format(parseServerDate(iso));
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm vitest run src/lib/date.test.ts` · Expected: PASS (기존 + 신규).

- [ ] **Step 5: Commit** *(사용자 요청 시)*

```bash
git add src/lib/date.ts src/lib/date.test.ts
git commit -m "feat: formatClockTime(KST HH:mm) (T12)"
```

---

## Task 4: `EventCard` date optional (모바일 재사용)

**Files:**
- Modify: `src/components/cards/EventCard.tsx`
- Test: `src/components/cards/EventCard.test.tsx` (케이스 추가)

- [ ] **Step 1: 실패 테스트 추가** — `EventCard.test.tsx` describe 안에 추가

```ts
it("date가 없으면 날짜 배지를 생략한다(모바일 목록 — 그룹 헤더가 날짜 담당)", () => {
  render(<EventCard title="성가대 연습" time="10:00 ~ 12:00" location="본당" />);
  expect(screen.getByText("성가대 연습")).toBeDefined();
  expect(screen.getByText("10:00 ~ 12:00")).toBeDefined();
  expect(screen.queryByText("2026. 6. 14.")).toBeNull();
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm vitest run src/components/cards/EventCard.test.tsx` · Expected: 신규 케이스 FAIL(현재 `date` 필수라 타입/렌더 불일치).

- [ ] **Step 3: 구현** — `EventCard.tsx` 수정 (2곳)

`EventCardProps`의 `date` 시그니처:
```ts
  date?: string | null;
```
`inner`의 첫 줄 `<Badge>`를 조건부로:
```tsx
      {date ? <Badge variant="primary">{date}</Badge> : null}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm vitest run src/components/cards/EventCard.test.tsx` · Expected: PASS (기존 메인 카드 케이스 포함 — date 넘기면 배지 유지).

- [ ] **Step 5: Commit** *(사용자 요청 시)*

```bash
git add src/components/cards/EventCard.tsx src/components/cards/EventCard.test.tsx
git commit -m "refactor: EventCard date optional(배지 생략) — 캘린더 모바일 재사용 (T12)"
```

---

## Task 5: `EventChip`

**Files:**
- Create: `src/components/events/EventChip.tsx`
- Test: `src/components/events/EventChip.test.tsx`

- [ ] **Step 1: 실패 테스트 작성** — `src/components/events/EventChip.test.tsx`

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventChip } from "./EventChip";
import type { EventCardResponse } from "@/lib/api/types";

afterEach(() => vi.clearAllMocks());

const ev = (o: Partial<EventCardResponse>): EventCardResponse => ({
  id: 1, title: "성가대 연습", location: null, startAt: "2026-06-14T10:00:00",
  endAt: null, allDay: false, tags: [], ...o,
});

describe("EventChip", () => {
  it("타임드는 'HH:mm 제목'", () => {
    render(<EventChip event={ev({})} onSelect={() => {}} />);
    expect(screen.getByRole("button").textContent).toBe("10:00 성가대 연습");
  });
  it("allDay는 제목만(시간 미표기, 검수 ⑤)", () => {
    render(<EventChip event={ev({ allDay: true, title: "야유회" })} onSelect={() => {}} />);
    const btn = screen.getByRole("button");
    expect(btn.textContent).toBe("야유회");
    expect(btn.textContent).not.toMatch(/\d{2}:\d{2}/);
  });
  it("클릭 시 onSelect(event)", () => {
    const onSelect = vi.fn();
    const e = ev({});
    render(<EventChip event={e} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(e);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm vitest run src/components/events/EventChip.test.tsx` · Expected: FAIL.

- [ ] **Step 3: 구현** — `src/components/events/EventChip.tsx`

```tsx
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
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm vitest run src/components/events/EventChip.test.tsx` · Expected: PASS.

- [ ] **Step 5: Commit** *(사용자 요청 시)*

```bash
git add src/components/events/EventChip.tsx src/components/events/EventChip.test.tsx
git commit -m "feat: EventChip(allDay 시간 생략·클릭→onSelect) (T12)"
```

---

## Task 6: `EventDayPopover` ("+n")

**Files:**
- Create: `src/components/events/EventDayPopover.tsx`
- Test: `src/components/events/EventDayPopover.test.tsx`

- [ ] **Step 1: 실패 테스트 작성** — `src/components/events/EventDayPopover.test.tsx`

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventDayPopover } from "./EventDayPopover";
import type { EventCardResponse } from "@/lib/api/types";

const ev = (id: number): EventCardResponse => ({
  id, title: `이벤트${id}`, location: null, startAt: "2026-06-14T10:00:00",
  endAt: null, allDay: false, tags: [],
});

describe("EventDayPopover", () => {
  it("트리거에 '+초과개수'를 표시(셀 표시 3개 기준)", () => {
    render(<EventDayPopover events={[ev(1), ev(2), ev(3), ev(4), ev(5)]} onSelect={() => {}} />);
    // 닫힘 상태 — 트리거만 렌더(Popover 내용은 Radix Portal, 미오픈)
    expect(screen.getByRole("button").textContent).toBe("+2");
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm vitest run src/components/events/EventDayPopover.test.tsx` · Expected: FAIL.

- [ ] **Step 3: 구현** — `src/components/events/EventDayPopover.tsx`

```tsx
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
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm vitest run src/components/events/EventDayPopover.test.tsx` · Expected: PASS.

- [ ] **Step 5: Commit** *(사용자 요청 시)*

```bash
git add src/components/events/EventDayPopover.tsx src/components/events/EventDayPopover.test.tsx
git commit -m "feat: EventDayPopover(+n 더보기) (T12)"
```

---

## Task 7: `EventDetailView` (모달·딥링크 공유)

**Files:**
- Create: `src/components/events/EventDetailView.tsx`
- Test: `src/components/events/EventDetailView.test.tsx`

> **제목은 렌더하지 않는다** — 소비처(딥링크 페이지=`<h1>`, 모달=`DialogTitle`)가 올바른 헤딩 레벨로 제공. 본 컴포넌트는 시각줄·장소·태그·본문만.

- [ ] **Step 1: 실패 테스트 작성** — `src/components/events/EventDetailView.test.tsx`

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { EventDetailView } from "./EventDetailView";
import type { EventDetailResponse } from "@/lib/api/types";

const base: EventDetailResponse = {
  id: 3, title: "성가대 연습", description: "# 준비물\n악보 지참",
  location: "본당", startAt: "2026-06-14T10:00:00", endAt: "2026-06-14T12:00:00",
  allDay: false, createdAt: "2026-06-01T09:00:00", updatedAt: "2026-06-01T09:00:00",
  version: 0, tags: [{ id: 3, name: "행사" }],
};

describe("EventDetailView", () => {
  it("시각줄·장소·태그 링크·마크다운 본문", () => {
    const { container } = render(<EventDetailView event={base} />);
    expect(container.textContent).toContain("2026. 6. 14.");
    expect(container.textContent).toContain("10:00 ~ 12:00");
    expect(screen.getByText("본당")).toBeDefined();
    expect(screen.getByRole("link", { name: "행사" }).getAttribute("href")).toBe("/events?tagId=3");
    expect(container.querySelector(".prose-church")?.textContent).toContain("악보 지참");
  });
  it("allDay는 시각 미표기(검수 ⑤), description 없으면 본문 생략", () => {
    const { container } = render(
      <EventDetailView event={{ ...base, allDay: true, endAt: null, description: null }} />,
    );
    expect(container.textContent).toContain("2026. 6. 14.");
    expect(container.textContent).not.toMatch(/\d{2}:\d{2}/);
    expect(container.querySelector(".prose-church")).toBeNull();
  });
  it("allDay 다일은 '~ M. D.'(날짜 표기 — 시간 아님)", () => {
    const { container } = render(
      <EventDetailView event={{ ...base, allDay: true, startAt: "2026-06-14T00:00:00", endAt: "2026-06-16T00:00:00" }} />,
    );
    expect(container.textContent).toContain("~ 6. 15.");
    expect(container.textContent).not.toMatch(/\d{2}:\d{2}/);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm vitest run src/components/events/EventDetailView.test.tsx` · Expected: FAIL.

- [ ] **Step 3: 구현** — `src/components/events/EventDetailView.tsx`

```tsx
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { formatDate, formatEventTime } from "@/lib/date";
import { formatAllDayRange } from "@/lib/calendar";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import type { EventDetailResponse } from "@/lib/api/types";

// 상세 본문(제목 제외 — 소비처가 헤딩 제공). 시각줄·장소·태그·마크다운. 서버·클라 공용.
export function EventDetailView({ event }: { event: EventDetailResponse }) {
  // all-day 범위는 버킷과 동일한 lastC에서 파생(formatAllDayRange), 타임드는 formatEventTime.
  const range = event.allDay
    ? formatAllDayRange(event.startAt, event.endAt ?? null)
    : formatEventTime(event.startAt, event.endAt, event.allDay);
  const timeLine = range ? `${formatDate(event.startAt)} ${range}` : formatDate(event.startAt);

  return (
    <div>
      <p className={cn(typo.datetime, "text-muted")}>{timeLine}</p>
      {event.location ? (
        <p className={cn(typo.bodySm, "mt-xxs text-muted")}>{event.location}</p>
      ) : null}
      {event.tags.length > 0 ? (
        <div className="mt-base flex flex-wrap gap-xs">
          {event.tags.map((t) => (
            <Link key={t.id} href={`/events?tagId=${t.id}`}>
              <Badge>{t.name}</Badge>
            </Link>
          ))}
        </div>
      ) : null}
      {event.description ? (
        <>
          <div className="mt-lg border-t border-hairline" />
          <MarkdownContent source={event.description} className="mt-lg" />
        </>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm vitest run src/components/events/EventDetailView.test.tsx` · Expected: PASS.

- [ ] **Step 5: Commit** *(사용자 요청 시)*

```bash
git add src/components/events/EventDetailView.tsx src/components/events/EventDetailView.test.tsx
git commit -m "feat: EventDetailView(시각줄·태그·마크다운, 모달·딥링크 공유) (T12)"
```

---

## Task 8: `EventDetailModal` (Dialog + 클라 fetch)

**Files:**
- Create: `src/components/events/EventDetailModal.tsx`
- Test: `src/components/events/EventDetailModal.test.tsx`

- [ ] **Step 1: 실패 테스트 작성** — `src/components/events/EventDetailModal.test.tsx`

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const { notifyError } = vi.hoisted(() => ({ notifyError: vi.fn() }));
vi.mock("@/lib/notify", () => ({ notify: { error: notifyError, success: vi.fn() } }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { EventDetailModal } from "./EventDetailModal";
import type { EventCardResponse } from "@/lib/api/types";

afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

const card: EventCardResponse = {
  id: 3, title: "성가대 연습", location: "본당", startAt: "2026-06-14T10:00:00",
  endAt: "2026-06-14T12:00:00", allDay: false, tags: [],
};
const detail = { ...card, description: "악보 지참", createdAt: "x", updatedAt: "x", version: 0 };

describe("EventDetailModal", () => {
  it("선택 시 제목 즉시 표시 + fetch 후 description", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => detail }) as Response));
    render(<EventDetailModal event={card} onClose={() => {}} />);
    expect(screen.getByText("성가대 연습")).toBeDefined(); // 카드 데이터 즉시(DialogTitle)
    await waitFor(() =>
      expect(document.body.textContent).toContain("악보 지참"),
    );
  });
  it("fetch 실패 시 notify.error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    render(<EventDetailModal event={card} onClose={() => {}} />);
    await waitFor(() => expect(notifyError).toHaveBeenCalled());
  });
  it("event=null이면 fetch 미호출(닫힘)", () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    render(<EventDetailModal event={null} onClose={() => {}} />);
    expect(spy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm vitest run src/components/events/EventDetailModal.test.tsx` · Expected: FAIL.

- [ ] **Step 3: 구현** — `src/components/events/EventDetailModal.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/common/Skeleton";
import { EventDetailView } from "./EventDetailView";
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
    if (!event) {
      setDetail(null);
      return;
    }
    let alive = true;
    setDetail(null);
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

  return (
    <Dialog
      open={event != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {event ? (
        <DialogContent>
          <DialogTitle>{event.title}</DialogTitle>
          {detail ? <EventDetailView event={detail} /> : <Skeleton className="h-40 w-full" />}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm vitest run src/components/events/EventDetailModal.test.tsx` · Expected: PASS.

- [ ] **Step 5: Commit** *(사용자 요청 시)*

```bash
git add src/components/events/EventDetailModal.tsx src/components/events/EventDetailModal.test.tsx
git commit -m "feat: EventDetailModal(Dialog + description 클라 fetch) (T12)"
```

---

## Task 9: `EventCalendar` (그리드 + 모바일 목록 + 모달)

**Files:**
- Create: `src/components/events/EventCalendar.tsx`
- Test: `src/components/events/EventCalendar.test.tsx`

- [ ] **Step 1: 실패 테스트 작성** — `src/components/events/EventCalendar.test.tsx`

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
// 모달은 별도 단위테스트가 커버 — 여기선 열림 여부만 확인하도록 스텁.
vi.mock("./EventDetailModal", () => ({
  EventDetailModal: ({ event }: { event: { id: number } | null }) =>
    event ? <div data-testid="modal" data-id={event.id} /> : null,
}));

import { EventCalendar } from "./EventCalendar";
import { buildCalendarModel } from "@/lib/calendar";
import type { EventCardResponse } from "@/lib/api/types";

const ev = (o: Partial<EventCardResponse>): EventCardResponse => ({
  id: 1, title: "t", location: null, startAt: "2026-06-10T10:00:00",
  endAt: null, allDay: false, tags: [], ...o,
});

// 6/10에 5건, 6/15(오늘) 1건 all-day
const events = [
  ...[1, 2, 3, 4, 5].map((i) => ev({ id: i, title: `이벤트${i}`, startAt: "2026-06-10T0" + i + ":00:00" })),
  ev({ id: 9, title: "야유회", allDay: true, startAt: "2026-06-15T00:00:00" }),
];
const model = buildCalendarModel({ year: 2026, month: 6, today: { y: 2026, m: 6, d: 15 }, events });

describe("EventCalendar", () => {
  it("월 네비 href가 year·month·tagId를 보존", () => {
    render(<EventCalendar model={model} tagId={3} />);
    expect(screen.getByLabelText("이전 달").getAttribute("href")).toBe("/events?year=2026&month=5&tagId=3");
    expect(screen.getByLabelText("다음 달").getAttribute("href")).toBe("/events?year=2026&month=7&tagId=3");
    expect(screen.getByRole("link", { name: "오늘" }).getAttribute("href")).toBe("/events?year=2026&month=6&tagId=3");
  });

  it("그리드: 셀당 칩 최대 3 + '+2', 오늘 마커(primary-soft)", () => {
    render(<EventCalendar model={model} tagId={undefined} />);
    const grid = screen.getByTestId("calendar-grid");
    // 6/10 셀: 칩 3개 노출 + "+2"
    expect(within(grid).getByText("+2")).toBeDefined();
    expect(within(grid).getByText(/이벤트1$/)).toBeDefined();
    expect(within(grid).queryByText(/이벤트5$/)).toBeNull(); // 4·5는 접힘(Popover 미오픈)
    // 오늘(15) 마커
    expect(within(grid).getByText("15").className).toContain("bg-primary-soft");
  });

  it("allDay 칩은 시간 미표기(검수 ⑤)", () => {
    render(<EventCalendar model={model} tagId={undefined} />);
    const grid = screen.getByTestId("calendar-grid");
    const chip = within(grid).getByText("야유회");
    expect(chip.textContent).not.toMatch(/\d{2}:\d{2}/);
  });

  it("모바일 목록: 날짜 그룹 헤더 + 칩 클릭 시 모달 오픈", () => {
    render(<EventCalendar model={model} tagId={undefined} />);
    const list = screen.getByTestId("calendar-list");
    expect(within(list).getByText("6월 15일 (월)")).toBeDefined();
    fireEvent.click(within(list).getAllByText("야유회")[0]);
    expect(screen.getByTestId("modal").getAttribute("data-id")).toBe("9");
  });

  it("이벤트 없으면 모바일 목록에 EmptyState", () => {
    const empty = buildCalendarModel({ year: 2026, month: 6, today: { y: 2026, m: 6, d: 15 }, events: [] });
    render(<EventCalendar model={empty} tagId={undefined} />);
    const list = screen.getByTestId("calendar-list");
    expect(within(list).getByText("등록된 일정이 없습니다.")).toBeDefined();
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm vitest run src/components/events/EventCalendar.test.tsx` · Expected: FAIL.

- [ ] **Step 3: 구현** — `src/components/events/EventCalendar.tsx`

```tsx
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
          <h2 className={cn(typo.titleLg, "text-ink")}>{`${year}년 ${month}월`}</h2>
          <Link href={hrefFor(next.y, next.m)} aria-label="다음 달" className={navIcon}>
            <ChevronRight size={20} aria-hidden />
          </Link>
        </div>
        <Link
          href={hrefFor(today.y, today.m)}
          className={cn(
            typo.button,
            "inline-flex h-10 items-center rounded-lg bg-surface-strong px-4 text-ink hover:bg-hairline",
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
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm vitest run src/components/events/EventCalendar.test.tsx` · Expected: PASS.

- [ ] **Step 5: Commit** *(사용자 요청 시)*

```bash
git add src/components/events/EventCalendar.tsx src/components/events/EventCalendar.test.tsx
git commit -m "feat: EventCalendar(그리드·모바일 목록·월 네비·모달) (T12)"
```

---

## Task 10: `/events` 페이지 (server)

**Files:**
- Create: `src/app/(site)/events/page.tsx`
- Test: `src/app/(site)/events/page.test.tsx`

- [ ] **Step 1: 실패 테스트 작성** — `src/app/(site)/events/page.test.tsx`

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { getEvents, getTags } = vi.hoisted(() => ({
  getEvents: vi.fn(),
  getTags: vi.fn(async () => [{ id: 3, name: "행사" }]),
}));
vi.mock("@/lib/api/events", () => ({ getEvents, EVENTS_PAGE_SIZE: 200 }));
vi.mock("@/lib/api/tags", () => ({ getTags }));
// 캘린더 코어는 단위테스트가 커버 — 월 결정만 고정.
vi.mock("@/lib/calendar", () => ({
  resolveMonth: vi.fn(() => ({ year: 2026, month: 6 })),
  buildCalendarModel: vi.fn(() => ({ year: 2026, month: 6, today: { y: 2026, m: 6, d: 15 }, weeks: [], dayGroups: [] })),
  kstCivilFromDate: vi.fn(() => ({ y: 2026, m: 6, d: 15 })),
}));
vi.mock("@/components/common/TagFilter", () => ({
  TagFilter: ({ tags }: { tags: unknown[] }) => <div data-testid="tagfilter" data-count={tags.length} />,
}));
vi.mock("@/components/events/EventCalendar", () => ({
  EventCalendar: ({ tagId }: { tagId?: number }) => <div data-testid="calendar" data-tag={String(tagId)} />,
}));

import EventsPage from "./page";

afterEach(() => vi.clearAllMocks());
const emptyPage = { content: [], page: { size: 200, number: 0, totalElements: 0, totalPages: 0 } };

describe("EventsPage", () => {
  it("year·month·tagId를 size=200으로 getEvents에 전달, 태그 병렬", async () => {
    getEvents.mockResolvedValueOnce(emptyPage);
    render(await EventsPage({ searchParams: Promise.resolve({ year: "2026", month: "6", tagId: "3" }) }));
    expect(getEvents).toHaveBeenCalledWith({ year: 2026, month: 6, tagId: 3, size: 200 });
    expect(getTags).toHaveBeenCalled();
    expect(screen.getByTestId("tagfilter").getAttribute("data-count")).toBe("1");
    expect(screen.getByTestId("calendar").getAttribute("data-tag")).toBe("3");
  });

  it("파라미터 없으면 resolveMonth 폴백 월로 조회(tagId 미전달)", async () => {
    getEvents.mockResolvedValueOnce(emptyPage);
    render(await EventsPage({ searchParams: Promise.resolve({}) }));
    expect(getEvents).toHaveBeenCalledWith({ year: 2026, month: 6, tagId: undefined, size: 200 });
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm vitest run "src/app/(site)/events/page.test.tsx"` · Expected: FAIL.

- [ ] **Step 3: 구현** — `src/app/(site)/events/page.tsx`

```tsx
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { getEvents, EVENTS_PAGE_SIZE } from "@/lib/api/events";
import { getTags } from "@/lib/api/tags";
import { buildCalendarModel, resolveMonth, kstCivilFromDate } from "@/lib/calendar";
import { TagFilter } from "@/components/common/TagFilter";
import { EventCalendar } from "@/components/events/EventCalendar";

type SearchParams = Record<string, string | string[] | undefined>;

function toNum(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

// 공개 일정 캘린더. searchParams 접근 → 동적 렌더(CI 빌드 prerender 미시도). 목록·태그 병렬.
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const { year, month } = resolveMonth({ year: toNum(sp.year), month: toNum(sp.month) }, now);
  const tagId = toNum(sp.tagId);

  const [data, tags] = await Promise.all([
    getEvents({ year, month, tagId, size: EVENTS_PAGE_SIZE }),
    getTags(),
  ]);
  const model = buildCalendarModel({
    year,
    month,
    today: kstCivilFromDate(now),
    events: data.content,
  });

  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>일정</h1>
      <div className="mt-lg">
        <TagFilter tags={tags} />
      </div>
      <div className="mt-lg">
        <EventCalendar model={model} tagId={tagId} />
      </div>
    </Container>
  );
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm vitest run "src/app/(site)/events/page.test.tsx"` · Expected: PASS.

- [ ] **Step 5: Commit** *(사용자 요청 시)*

```bash
git add "src/app/(site)/events/page.tsx" "src/app/(site)/events/page.test.tsx"
git commit -m "feat: /events 페이지(서버: 월 조회·KST 모델·TagFilter) (T12)"
```

---

## Task 11: `/events/[id]` 딥링크 (server)

**Files:**
- Create: `src/app/(site)/events/[id]/page.tsx`
- Test: `src/app/(site)/events/[id]/page.test.tsx`

- [ ] **Step 1: 실패 테스트 작성** — `src/app/(site)/events/[id]/page.test.tsx`

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const { getEvent } = vi.hoisted(() => ({ getEvent: vi.fn() }));
vi.mock("@/lib/api/events", () => ({ getEvent }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import EventDetailPage from "./page";

afterEach(() => vi.clearAllMocks());

const detail = {
  id: 3, title: "성가대 연습", description: "악보 지참", location: "본당",
  startAt: "2026-06-14T10:00:00", endAt: "2026-06-14T12:00:00", allDay: false,
  createdAt: "2026-06-01T09:00:00", updatedAt: "2026-06-01T09:00:00", version: 0,
  tags: [{ id: 3, name: "행사" }],
};

describe("EventDetailPage (딥링크)", () => {
  it("제목·상세 본문 렌더", async () => {
    getEvent.mockResolvedValueOnce(detail);
    const { container } = render(await EventDetailPage({ params: Promise.resolve({ id: "3" }) }));
    expect(getEvent).toHaveBeenCalledWith(3);
    expect(screen.getByRole("heading", { name: "성가대 연습" })).toBeDefined();
    expect(container.textContent).toContain("10:00 ~ 12:00");
    expect(container.querySelector(".prose-church")?.textContent).toContain("악보 지참");
  });
  it("없는 일정(null)이면 notFound", async () => {
    getEvent.mockResolvedValueOnce(null);
    await expect(EventDetailPage({ params: Promise.resolve({ id: "99" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it("비숫자·0·음수 id면 notFound(fetch 미호출)", async () => {
    await expect(EventDetailPage({ params: Promise.resolve({ id: "abc" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(EventDetailPage({ params: Promise.resolve({ id: "0" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getEvent).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm vitest run "src/app/(site)/events/[id]/page.test.tsx"` · Expected: FAIL.

- [ ] **Step 3: 구현** — `src/app/(site)/events/[id]/page.tsx`

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { getEvent } from "@/lib/api/events";
import { EventDetailView } from "@/components/events/EventDetailView";

// 공개 일정 상세(딥링크). 일정은 viewCount 없음 → 캐시 가능(getEvent revalidate 60).
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const event = await getEvent(numId);
  if (!event) notFound();

  return (
    <Container as="section" className="py-section">
      <Link
        href="/events"
        className={cn(typo.bodySm, "inline-flex items-center gap-xxs text-primary")}
      >
        <ChevronLeft size={16} aria-hidden />
        일정
      </Link>

      <h1 className={cn(typo.titleLg, "mt-lg text-ink")}>{event.title}</h1>
      <div className="mt-xs">
        <EventDetailView event={event} />
      </div>
    </Container>
  );
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm vitest run "src/app/(site)/events/[id]/page.test.tsx"` · Expected: PASS.

- [ ] **Step 5: Commit** *(사용자 요청 시)*

```bash
git add "src/app/(site)/events/[id]/page.tsx" "src/app/(site)/events/[id]/page.test.tsx"
git commit -m "feat: /events/[id] 딥링크 상세(EventDetailView 공유) (T12)"
```

---

## Task 12: 전체 검증 + 검수 게이트

**Files:** 없음(검증만).

- [ ] **Step 1: 전체 테스트** — Run: `pnpm test` · Expected: 전 스위트 PASS(신규 + 기존 회귀, 특히 EventCard·date.ts).

- [ ] **Step 2: 린트** — Run: `pnpm lint` · Expected: 이슈 없음. (삼항 조건부·토큰 사용·미사용 import 확인)

- [ ] **Step 3: 외부 캘린더 라이브러리 부재 확인(검수 ⑦)** — Run: `node -e "const d=require('./package.json');const bad=['fullcalendar','@fullcalendar/core','react-big-calendar','date-fns','dayjs','moment'].filter(p=>({...d.dependencies,...d.devDependencies})[p]);if(bad.length){console.error('금지 의존성:',bad);process.exit(1)}console.log('OK: 캘린더/날짜 라이브러리 없음')"` · Expected: `OK`.

- [ ] **Step 4: 프로덕션 빌드** — Run: `pnpm build` · Expected: 성공. `/events`·`/events/[id]`가 **동적 라우트(ƒ)**로 분류(searchParams·동적 세그먼트). 백엔드 없이도 prerender 미시도로 통과.

- [ ] **Step 5: 검수 기준 대조(이슈 §5 / 스펙 §10)** — 아래를 테스트 결과로 확인:
  - [ ] 월 이동 `year`+`month` 쌍 재조회(반쪽 400 없음) — `events.test.ts`·`EventCalendar.test.tsx`·`page.test.tsx`
  - [ ] `endAt=null` 점 이벤트 시작일 셀만 — `calendar.test.ts`
  - [ ] 기간 이벤트 전 셀 + `end_at` 배타(자정 다음날 제외) + OVERLAP — `calendar.test.ts`
  - [ ] `allDay` 시간 미표기 — `EventChip`·`EventDetailView`·`EventCalendar`
  - [ ] 오늘 마커·1024px 전환 — `EventCalendar.test.tsx`(`bg-primary-soft`·`hidden lg:block`/`lg:hidden`)
  - [ ] 외부 캘린더 라이브러리 부재 — Step 3
  - [ ] TZ 안전·표시↔버킷 일치·NaN 가드 — `calendar.test.ts`

- [ ] **Step 6: Commit** *(사용자 요청 시 — 전체 일괄 또는 미커밋분)* — 필요 시 `.report/`·문서 포함.

---

## Self-Review (작성자 점검 결과)

**1. 스펙 커버리지:** 스펙 §3 파일 전부 Task 1–11에 대응. §5 KST 코어=Task 2, §6 표시=Task 2·3·7, §7 컴포넌트=Task 5–9, §8 페이지·검증=Task 10·11, §10 테스트=각 Task RED + Task 12, §13 가정(A1 배타·A2 퇴화·A3 NaN)=Task 2 테스트로 고정.

**2. 플레이스홀더:** 없음 — 모든 코드 스텝에 실제 코드. "적절히 처리" 류 문구 없음.

**3. 타입 일관성:** `EventListParams`(year·month 필수)·`CalendarModel`/`DayCell`/`DayGroup`·`CivilDate`·`formatAllDayRange(startAt, endAt|null)`·`EventChip({event,onSelect})`·`EventDetailModal({event,onClose})`가 정의처(Task 1·2·5·8)와 소비처(Task 9·10·11)에서 동일. `EventDetailView`는 제목 미렌더(소비처가 `<h1>`/`DialogTitle` 제공) — Task 7·8·11 일관.

**4. 가정 검증(A1):** all-day end 배타(익일 자정) 인코딩은 구현 중 실제 일정 1건으로 확인(스펙 §13). 어긋나면 `bucketEvents`·`formatAllDayRange`의 `lastC`를 `kstCivil(endAt)`로 동시 전환(두 곳 한정).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-12-event-calendar.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Task별 신규 서브에이전트 디스패치 + Task 간 2단계 리뷰, 빠른 반복.

**2. Inline Execution** — 이 세션에서 executing-plans로 체크포인트 배치 실행.

**어느 방식으로 진행할까요?**
