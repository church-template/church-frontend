# 성경통독 챌린지 프론트엔드 연동 구현 계획 (#88)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 백엔드 성경통독 챌린지 API 9종을 회원 영역(목록·상세 대시보드·기록·마이페이지 이력)과 어드민 CRUD UI로 연동한다.

**Architecture:** 전 엔드포인트가 회원 전용(`CHALLENGE_PARTICIPATE`/`CHALLENGE_MANAGE`)이라 공개 RSC/ISR 없이 갤러리 패턴(얇은 RSC + 게이트 + TanStack Query 클라 컴포넌트)으로 구현. join/read/취소가 모두 `MyProgressResponse`를 반환하므로 낙관적 업데이트 없이 `setQueryData`로 즉시 반영. 상세는 C-2 다크 몰입 디자인(다크 밴드 + 초대형 타이포 + ✓ 달력).

**Tech Stack:** Next.js 16 App Router, TanStack Query v5, RHF+zod v4, Tailwind v4 토큰, vitest+RTL.

**Spec:** `docs/superpowers/specs/2026-07-07-bible-challenge-frontend-design.md` (모든 요구사항의 단일 진실)

## Global Constraints

- 답변·주석·커밋 메시지는 한국어. 주석은 WHY 중심 최소화.
- 커밋 메시지 형식 `<type> : <설명> #88`. **Co-Authored-By 금지.** 커밋은 각 태스크의 Commit 스텝에서만.
- hex·px 인라인 금지 — globals.css `@theme` 토큰(Tailwind 유틸)만. 텍스트 스타일은 `typo.*` 상수만.
- UI 이모지 금지, 아이콘은 `lucide-react`만(`currentColor`, `size` prop).
- JSX 조건부 렌더링은 삼항(`{cond ? <X/> : null}`) — `{cond && <X/>}` 금지. `cn()` 내부 `&&`는 허용.
- 새 라이브러리 추가 금지 (달력은 직접 구현 — `src/lib/calendar.ts`의 `monthMatrix` 재사용).
- zod v4: `z.number({ invalid_type_error })` 없음 — 메시지 없이 쓰거나 `{ error }`.
- 테스트: vitest globals:false(명시 import), jest-dom 없음(`toBeDefined()`/`getAttribute`), `vi.hoisted` mock, `QueryClientProvider` 래퍼. 테스트는 소스 옆 co-located.
- `pnpm lint`는 타입체크 아님 — 검증은 `npx tsc --noEmit` 별도 실행.
- effect 내 React setState 금지(lint 에러) — RHF `reset()`·`notify`는 허용, 시드는 useQuery 파생.
- `.admin.ts` API 파일은 client 컴포넌트 전용(RSC import 시 빌드 오류).
- 어드민 목록도 회원 `GET /api/bible-challenges` 재사용(어드민 전용 GET 없음). ISR revalidate 불필요(공개 페이지 없는 도메인).
- 작업 디렉토리: 현재 브랜치 `20260706_#88_성경통독_챌린지_API_연동_및_UI_구현`에서 그대로 작업.

---

### Task 1: 성경 구조 상수 `constants/bible.ts`

**Files:**
- Create: `src/constants/bible.ts`
- Test: `src/constants/bible.test.ts`

**Interfaces:**
- Consumes: 없음 (순수 상수)
- Produces: `BIBLE_BOOKS: readonly { name: string; chapters: number }[]`(66개), `bookName(n: number): string`(1-based), `chapterCount(startBook: number, endBook: number): number`, `locate(startBook: number, ordinal: number): { book: string; chapter: number }`, `dailyGoalOf(totalChapters: number, targetDays: number): number`, `challengeEndDate(startDate: string, targetDays: number): string`("YYYY-MM-DD"), `formatRange(startBook: number, endBook: number): string`("창세기 ~ 요한계시록" / 같은 권이면 "시편")

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/constants/bible.test.ts
import { describe, it, expect } from "vitest";
import {
  BIBLE_BOOKS, bookName, chapterCount, locate, dailyGoalOf, challengeEndDate, formatRange,
} from "./bible";

describe("BIBLE_BOOKS", () => {
  it("66권, 구약 929·신약 260·전체 1189장 (백엔드 BibleStructure 스냅샷)", () => {
    expect(BIBLE_BOOKS).toHaveLength(66);
    const sum = (a: number, b: number) =>
      BIBLE_BOOKS.slice(a - 1, b).reduce((s, x) => s + x.chapters, 0);
    expect(sum(1, 39)).toBe(929);
    expect(sum(40, 66)).toBe(260);
    expect(sum(1, 66)).toBe(1189);
  });
  it("양끝 권 이름", () => {
    expect(bookName(1)).toBe("창세기");
    expect(bookName(40)).toBe("마태복음");
    expect(bookName(66)).toBe("요한계시록");
  });
});

describe("chapterCount", () => {
  it("전체·신약·단일 권 구간", () => {
    expect(chapterCount(1, 66)).toBe(1189);
    expect(chapterCount(40, 66)).toBe(260);
    expect(chapterCount(19, 19)).toBe(150); // 시편
  });
});

describe("locate", () => {
  it("구간 시작권 기준 1-based ordinal → (권, 장), 권 경계 이월", () => {
    expect(locate(1, 1)).toEqual({ book: "창세기", chapter: 1 });
    expect(locate(1, 50)).toEqual({ book: "창세기", chapter: 50 });
    expect(locate(1, 51)).toEqual({ book: "출애굽기", chapter: 1 });
    expect(locate(40, 29)).toEqual({ book: "마가복음", chapter: 1 });
    expect(locate(1, 1189)).toEqual({ book: "요한계시록", chapter: 22 });
  });
});

describe("파생 계산 (어드민 미리보기)", () => {
  it("하루 목표 = ⌈장 수/일수⌉", () => {
    expect(dailyGoalOf(260, 65)).toBe(4);
    expect(dailyGoalOf(1189, 365)).toBe(4); // 3.257… → 4
  });
  it("종료일 = 시작일 + targetDays - 1 (포함)", () => {
    expect(challengeEndDate("2026-01-05", 65)).toBe("2026-03-10");
    expect(challengeEndDate("2026-12-31", 1)).toBe("2026-12-31");
  });
  it("범위 라벨", () => {
    expect(formatRange(40, 66)).toBe("마태복음 ~ 요한계시록");
    expect(formatRange(19, 19)).toBe("시편");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/constants/bible.test.ts`
Expected: FAIL — "Cannot find module './bible'" 또는 export 미존재.

- [ ] **Step 3: 구현**

```ts
// src/constants/bible.ts
// 개신교 정경 66권 1189장 — 불변 상수. 백엔드 BibleStructure.java와 동일 숫자·한글 이름
// (currentPosition.book이 백엔드 이름으로 오므로 표기 일치 필수 — bible.test.ts가 드리프트 감시).
// 콘텐츠 하드코딩 금지 예외 아님: 교회별로 변하지 않는 성경 구조 데이터다(백엔드 동일 판단).

const NAMES = [
  "창세기", "출애굽기", "레위기", "민수기", "신명기", "여호수아", "사사기", "룻기", "사무엘상", "사무엘하",
  "열왕기상", "열왕기하", "역대상", "역대하", "에스라", "느헤미야", "에스더", "욥기", "시편", "잠언",
  "전도서", "아가", "이사야", "예레미야", "예레미야애가", "에스겔", "다니엘", "호세아", "요엘", "아모스",
  "오바댜", "요나", "미가", "나훔", "하박국", "스바냐", "학개", "스가랴", "말라기", "마태복음",
  "마가복음", "누가복음", "요한복음", "사도행전", "로마서", "고린도전서", "고린도후서", "갈라디아서", "에베소서", "빌립보서",
  "골로새서", "데살로니가전서", "데살로니가후서", "디모데전서", "디모데후서", "디도서", "빌레몬서", "히브리서", "야고보서", "베드로전서",
  "베드로후서", "요한일서", "요한이서", "요한삼서", "유다서", "요한계시록",
] as const;

const CHAPTERS = [
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31,
  12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4, 28,
  16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5,
  3, 5, 1, 1, 1, 22,
] as const;

export const BIBLE_BOOKS: readonly { name: string; chapters: number }[] = NAMES.map(
  (name, i) => ({ name, chapters: CHAPTERS[i] }),
);

// CUMULATIVE[b] = 1~b권 장 수 합 (CUMULATIVE[0]=0, CUMULATIVE[66]=1189) — 백엔드와 동일 산술.
const CUMULATIVE = CHAPTERS.reduce<number[]>((acc, c) => (acc.push(acc[acc.length - 1] + c), acc), [0]);

/** 1-based 권 번호 → 한글 이름. 범위 밖은 호출자 책임(백엔드가 1~66 보장). */
export function bookName(n: number): string {
  return NAMES[n - 1];
}

/** 구간 [startBook, endBook]의 총 장 수. */
export function chapterCount(startBook: number, endBook: number): number {
  return CUMULATIVE[endBook] - CUMULATIVE[startBook - 1];
}

/** 구간 시작권 기준 ordinal(1-based)번째 장의 (권, 장) — 백엔드 locate와 동일 의미. */
export function locate(startBook: number, ordinal: number): { book: string; chapter: number } {
  const global = CUMULATIVE[startBook - 1] + ordinal;
  let book = 1;
  while (CUMULATIVE[book] < global) book++;
  return { book: NAMES[book - 1], chapter: global - CUMULATIVE[book - 1] };
}

/** 하루 목표 = ⌈구간 장 수 / 목표 일수⌉ — 어드민 폼 미리보기용(생성 후 진실은 서버 응답). */
export function dailyGoalOf(totalChapters: number, targetDays: number): number {
  return Math.ceil(totalChapters / targetDays);
}

/** 종료일 = 시작일 + targetDays - 1 (포함). 입력·출력 모두 "YYYY-MM-DD" — UTC 산술이라 TZ 무관. */
export function challengeEndDate(startDate: string, targetDays: number): string {
  const [y, m, d] = startDate.split("-").map(Number);
  const end = new Date(Date.UTC(y, m - 1, d + targetDays - 1));
  return end.toISOString().slice(0, 10);
}

/** "창세기 ~ 요한계시록" / 단일 권이면 "시편" — 카드·어드민 테이블 범위 표기. */
export function formatRange(startBook: number, endBook: number): string {
  return startBook === endBook ? bookName(startBook) : `${bookName(startBook)} ~ ${bookName(endBook)}`;
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/constants/bible.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: 커밋 없음** — Task 3 끝에서 API 레이어와 묶어 커밋한다.

---

### Task 2: 응답 타입 + 회원 API 함수 `lib/api/challenges.ts`

**Files:**
- Modify: `src/lib/api/types.ts` (파일 끝에 챌린지 타입 블록 추가)
- Create: `src/lib/api/challenges.ts`
- Test: `src/lib/api/challenges.test.ts`

**Interfaces:**
- Consumes: `authFetch(path, init?): Promise<Response>`, `parseJson<T>(res)`, `buildListQuery({page,size,sort})`, `Page<T>`
- Produces (타입): `ChallengeStatus`, `ChallengeCardResponse`, `ChallengeDetailResponse`, `ChallengeSummaryResponse`, `BiblePositionResponse`, `MyProgressResponse`, `ReadingLogResponse`, `MyParticipationResponse` (전부 types.ts export)
- Produces (함수): `CHALLENGE_PAGE_SIZE = 12`, `fetchChallenges(params: { page?: number }): Promise<Page<ChallengeCardResponse>>`, `fetchChallenge(id: number): Promise<ChallengeDetailResponse>`, `fetchMyProgress(id: number): Promise<MyProgressResponse>`, `fetchMyLogs(id: number, range?: { from?: string; to?: string }): Promise<ReadingLogResponse[]>`, `fetchMyParticipations(params: { page?: number }): Promise<Page<MyParticipationResponse>>`, `joinChallenge(id: number): Promise<MyProgressResponse>`, `recordRead(id: number, body: { chapters?: number; date?: string }): Promise<MyProgressResponse>`, `cancelRead(id: number, date?: string): Promise<MyProgressResponse>`

- [ ] **Step 1: types.ts에 타입 추가** (파일 끝에 append — 기존 코드 무수정)

```ts
// ── 성경통독 챌린지(회원전용, CHALLENGE_PARTICIPATE) — OpenAPI Challenge*·MyProgress·Participation ──
export type ChallengeStatus = "UPCOMING" | "ONGOING" | "ENDED";

export interface ChallengeCardResponse {
  id: number;
  title: string;
  startBook: number; // 1~66
  endBook: number;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;
  targetDays: number;
  totalChapters: number;
  dailyGoal: number;
  status: ChallengeStatus;
}

export interface ChallengeDetailResponse extends ChallengeCardResponse {
  description?: string | null; // raw 마크다운
  joined: boolean;
  version: number; // 낙관락 — 어드민 PATCH에서 전송
}

export interface ChallengeSummaryResponse {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  status: ChallengeStatus;
  totalChapters: number;
}

export interface BiblePositionResponse {
  book: string; // 백엔드 한글 권 이름(constants/bible.ts NAMES와 일치)
  chapter: number;
}

export interface MyProgressResponse {
  progressRate: number; // 현재 회독 기준 %
  currentPosition: BiblePositionResponse | null; // 마지막으로 읽은 장 — chaptersRead 0이면 null
  chaptersRead: number; // 현재 회독 포인터(0~totalChapters)
  totalChapters: number;
  todayChapters: number; // 오늘 이미 기록한 장 수
  dailyGoal: number;
  todayDone: boolean;
  streakDays: number;
  roundsCompleted: number;
  paceDays: number | null; // ENDED면 null. 양수=빠름
  challenge: ChallengeSummaryResponse;
}

export interface ReadingLogResponse {
  readDate: string; // "YYYY-MM-DD"
  chapters: number;
}

export interface MyParticipationResponse {
  challenge: ChallengeSummaryResponse;
  joinedAt: string; // "YYYY-MM-DD"
  progressRate: number;
  chaptersRead: number;
  roundsCompleted: number;
  completed: boolean; // rounds ≥ 1
  streakDays: number;
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

```ts
// src/lib/api/challenges.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const authFetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));

import {
  fetchChallenges, fetchChallenge, fetchMyProgress, fetchMyLogs, fetchMyParticipations,
  joinChallenge, recordRead, cancelRead, CHALLENGE_PAGE_SIZE,
} from "./challenges";

function jsonRes(data: unknown) {
  return new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
}
const progress = {
  progressRate: 34.2, currentPosition: { book: "마태복음", chapter: 4 }, chaptersRead: 89,
  totalChapters: 260, todayChapters: 0, dailyGoal: 4, todayDone: false, streakDays: 23,
  roundsCompleted: 0, paceDays: 3,
  challenge: { id: 1, title: "T", startDate: "2026-01-05", endDate: "2026-03-10", status: "ONGOING", totalChapters: 260 },
};

beforeEach(() => authFetchMock.mockReset());

describe("목록·상세·이력 GET", () => {
  it("fetchChallenges: page·size·sort(startDate,desc) 쿼리", async () => {
    authFetchMock.mockResolvedValue(jsonRes({ content: [], page: { size: 12, number: 0, totalElements: 0, totalPages: 0 } }));
    await fetchChallenges({ page: 0 });
    expect(authFetchMock).toHaveBeenCalledWith(
      `/api/bible-challenges?page=0&size=${CHALLENGE_PAGE_SIZE}&sort=startDate%2Cdesc`,
    );
  });
  it("fetchChallenge: 경로에 id", async () => {
    authFetchMock.mockResolvedValue(jsonRes({ id: 7, joined: false }));
    const d = await fetchChallenge(7);
    expect(authFetchMock).toHaveBeenCalledWith("/api/bible-challenges/7");
    expect(d.id).toBe(7);
  });
  it("fetchMyLogs: from/to 있으면 쿼리 포함, 없으면 생략", async () => {
    authFetchMock.mockResolvedValue(jsonRes([]));
    await fetchMyLogs(1, { from: "2026-01-01", to: "2026-01-31" });
    expect(authFetchMock).toHaveBeenCalledWith("/api/bible-challenges/1/my-logs?from=2026-01-01&to=2026-01-31");
    await fetchMyLogs(1);
    expect(authFetchMock).toHaveBeenLastCalledWith("/api/bible-challenges/1/my-logs");
  });
  it("fetchMyProgress·fetchMyParticipations 경로", async () => {
    authFetchMock.mockResolvedValue(jsonRes(progress));
    await fetchMyProgress(1);
    expect(authFetchMock).toHaveBeenCalledWith("/api/bible-challenges/1/my-progress");
    authFetchMock.mockResolvedValue(jsonRes({ content: [], page: { size: 12, number: 0, totalElements: 0, totalPages: 0 } }));
    await fetchMyParticipations({ page: 0 });
    expect(authFetchMock).toHaveBeenLastCalledWith(
      `/api/bible-challenges/my-participations?page=0&size=${CHALLENGE_PAGE_SIZE}`,
    );
  });
});

describe("쓰기 3종 — MyProgressResponse 반환", () => {
  it("joinChallenge: POST /join", async () => {
    authFetchMock.mockResolvedValue(jsonRes(progress));
    const p = await joinChallenge(1);
    expect(authFetchMock).toHaveBeenCalledWith("/api/bible-challenges/1/join", { method: "POST" });
    expect(p.streakDays).toBe(23);
  });
  it("recordRead: POST /read, body 필드는 값 있을 때만", async () => {
    authFetchMock.mockResolvedValue(jsonRes(progress));
    await recordRead(1, {});
    expect(authFetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", body: JSON.stringify({}) });
    await recordRead(1, { chapters: 5, date: "2026-01-20" });
    expect(authFetchMock.mock.calls[1][1].body).toBe(JSON.stringify({ chapters: 5, date: "2026-01-20" }));
  });
  it("cancelRead: DELETE /read?date=, date 없으면 쿼리 생략", async () => {
    authFetchMock.mockResolvedValue(jsonRes(progress));
    await cancelRead(1, "2026-01-20");
    expect(authFetchMock).toHaveBeenCalledWith("/api/bible-challenges/1/read?date=2026-01-20", { method: "DELETE" });
    await cancelRead(1);
    expect(authFetchMock).toHaveBeenLastCalledWith("/api/bible-challenges/1/read", { method: "DELETE" });
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm test src/lib/api/challenges.test.ts`
Expected: FAIL — "Cannot find module './challenges'"

- [ ] **Step 4: 구현**

```ts
// src/lib/api/challenges.ts
// 성경통독 챌린지 — 전 엔드포인트 회원전용(CHALLENGE_PARTICIPATE) → authFetch만 사용(갤러리 패턴).
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import { buildListQuery, type Page } from "@/lib/page";
import type {
  ChallengeCardResponse, ChallengeDetailResponse, MyProgressResponse,
  ReadingLogResponse, MyParticipationResponse,
} from "./types";

export const CHALLENGE_PAGE_SIZE = 12;

export async function fetchChallenges(params: { page?: number }): Promise<Page<ChallengeCardResponse>> {
  const qs = buildListQuery({ page: params.page, size: CHALLENGE_PAGE_SIZE, sort: "startDate,desc" });
  return parseJson(await authFetch(`/api/bible-challenges${qs}`));
}

export async function fetchChallenge(id: number): Promise<ChallengeDetailResponse> {
  return parseJson(await authFetch(`/api/bible-challenges/${id}`));
}

export async function fetchMyProgress(id: number): Promise<MyProgressResponse> {
  return parseJson(await authFetch(`/api/bible-challenges/${id}/my-progress`));
}

// from/to 생략 시 챌린지 기간 전체(백엔드 기본). 달력은 표시 월 범위로 호출.
export async function fetchMyLogs(id: number, range?: { from?: string; to?: string }): Promise<ReadingLogResponse[]> {
  const sp = new URLSearchParams();
  if (range?.from) sp.set("from", range.from);
  if (range?.to) sp.set("to", range.to);
  const qs = sp.toString();
  return parseJson(await authFetch(`/api/bible-challenges/${id}/my-logs${qs ? `?${qs}` : ""}`));
}

export async function fetchMyParticipations(params: { page?: number }): Promise<Page<MyParticipationResponse>> {
  const qs = buildListQuery({ page: params.page, size: CHALLENGE_PAGE_SIZE });
  return parseJson(await authFetch(`/api/bible-challenges/my-participations${qs}`));
}

// 쓰기 3종 — 모두 갱신된 MyProgressResponse 반환(setQueryData로 즉시 반영, 스펙 §1).
export async function joinChallenge(id: number): Promise<MyProgressResponse> {
  return parseJson(await authFetch(`/api/bible-challenges/${id}/join`, { method: "POST" }));
}

// chapters 생략 = 그날 남은 목표치(서버 기본값), date 생략 = 오늘(서버 KST).
export async function recordRead(
  id: number,
  body: { chapters?: number; date?: string },
): Promise<MyProgressResponse> {
  const payload: Record<string, unknown> = {};
  if (body.chapters != null) payload.chapters = body.chapters;
  if (body.date != null) payload.date = body.date;
  return parseJson(
    await authFetch(`/api/bible-challenges/${id}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function cancelRead(id: number, date?: string): Promise<MyProgressResponse> {
  const qs = date ? `?date=${date}` : "";
  return parseJson(await authFetch(`/api/bible-challenges/${id}/read${qs}`, { method: "DELETE" }));
}
```

주의: recordRead의 Response mock 검증에서 `headers`까지 비교하지 않도록 테스트는 `toMatchObject`/`body` 필드만 본다(Step 2 코드 그대로).

- [ ] **Step 5: 통과 확인**

Run: `pnpm test src/lib/api/challenges.test.ts`
Expected: PASS

- [ ] **Step 6: 커밋 없음** — Task 3 끝에서 묶어 커밋.

---

### Task 3: 어드민 API 함수 `lib/api/challenges.admin.ts`

**Files:**
- Create: `src/lib/api/challenges.admin.ts`
- Test: `src/lib/api/challenges.admin.test.ts`

**Interfaces:**
- Consumes: `apiMutate<T>(path, { method, body })`, `ChallengeDetailResponse`
- Produces: `ChallengeCreateRequest { title: string; description?: string; startBook: number; endBook: number; startDate: string; targetDays: number }`, `ChallengePatchRequest { title?: string; description?: string; startBook?: number; endBook?: number; startDate?: string; targetDays?: number; version: number }`, `createChallenge(body): Promise<ChallengeDetailResponse>`, `patchChallenge(id, body): Promise<ChallengeDetailResponse>`, `deleteChallenge(id): Promise<void>`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/lib/api/challenges.admin.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const apiMutateMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { createChallenge, patchChallenge, deleteChallenge } from "./challenges.admin";

beforeEach(() => apiMutateMock.mockReset());

describe("challenges.admin", () => {
  it("createChallenge: POST /api/admin/bible-challenges", async () => {
    apiMutateMock.mockResolvedValue({ id: 1 });
    const body = { title: "T", startBook: 40, endBook: 66, startDate: "2026-01-05", targetDays: 65 };
    await createChallenge(body);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/bible-challenges", { method: "POST", body });
  });
  it("patchChallenge: PATCH + version", async () => {
    apiMutateMock.mockResolvedValue({ id: 1 });
    await patchChallenge(1, { title: "T2", version: 3 });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/bible-challenges/1", {
      method: "PATCH", body: { title: "T2", version: 3 },
    });
  });
  it("deleteChallenge: DELETE", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteChallenge(1);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/bible-challenges/1", { method: "DELETE" });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/lib/api/challenges.admin.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

```ts
// src/lib/api/challenges.admin.ts
// 어드민 챌린지 쓰기(CHALLENGE_MANAGE). client 컴포넌트에서만 호출(RSC 번들 경계 — authFetch 체인).
// 어드민 전용 GET 없음 — 목록·상세 읽기는 회원 API(challenges.ts) 재사용(스펙 §3).
import { apiMutate } from "@/lib/admin/apiMutate";
import type { ChallengeDetailResponse } from "./types";

// 요청 타입은 도메인-로컬(types.ts 규약 — 어드민 쓰기 타입은 공유 파일 금지).
export interface ChallengeCreateRequest {
  title: string; // ≤100
  description?: string; // ≤50000, raw 마크다운
  startBook: number; // 1~66
  endBook: number; // startBook ≤ endBook
  startDate: string; // "YYYY-MM-DD"
  targetDays: number; // 1~3650
}

// PATCH — 보낸 필드만 수정. 참여자 존재 시 범위·기간 필드는 백엔드가 400으로 거부(스펙 §7).
export interface ChallengePatchRequest {
  title?: string;
  description?: string;
  startBook?: number;
  endBook?: number;
  startDate?: string;
  targetDays?: number;
  version: number; // 낙관락 필수
}

export function createChallenge(body: ChallengeCreateRequest): Promise<ChallengeDetailResponse> {
  return apiMutate<ChallengeDetailResponse>("/api/admin/bible-challenges", { method: "POST", body });
}

export function patchChallenge(id: number, body: ChallengePatchRequest): Promise<ChallengeDetailResponse> {
  return apiMutate<ChallengeDetailResponse>(`/api/admin/bible-challenges/${id}`, { method: "PATCH", body });
}

export function deleteChallenge(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/bible-challenges/${id}`, { method: "DELETE" });
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/lib/api/challenges.admin.test.ts`
Expected: PASS

- [ ] **Step 5: 타입체크 + 커밋 (기반 레이어 묶음)**

Run: `npx tsc --noEmit` → Expected: 에러 0
```bash
git add src/constants/bible.ts src/constants/bible.test.ts src/lib/api/types.ts \
  src/lib/api/challenges.ts src/lib/api/challenges.test.ts \
  src/lib/api/challenges.admin.ts src/lib/api/challenges.admin.test.ts
git commit -m "feat : 성경 구조 상수 및 챌린지 API 클라이언트 추가 #88"
```

---

### Task 4: 네비게이션 · 권한 라벨 · 디자인 토큰 · DESIGN.md 등록

**Files:**
- Modify: `src/constants/navigation.ts` (NavIconKey 유니온 + WORSHIP_LINKS)
- Modify: `src/components/shell/MegaMenu.tsx` (ICONS 매핑 1줄 + lucide import)
- Modify: `src/constants/navigation.test.ts` (예배·설교 하위 링크 검증 추가)
- Modify: `src/constants/permissions.ts` (라벨 2건)
- Modify: `src/app/globals.css` (`--color-primary-on-dark` 토큰 1건)
- Modify: `.claude/rules/DESIGN.md` (색 목록 1줄 + 컴포넌트 3항목)

**Interfaces:**
- Produces: 네비 링크 `/challenges`(라벨 "성경통독", icon `bookOpenCheck`), 유틸 클래스 `text-primary-on-dark`/`bg-primary-on-dark`, `PERMISSION_LABELS.CHALLENGE_MANAGE`·`CHALLENGE_PARTICIPATE`

- [ ] **Step 1: navigation.test.ts에 실패하는 테스트 추가** (기존 "교회소식 하위에…" 테스트 아래)

```ts
  it("예배·설교 하위에 예배시간·설교·성경통독이 있다", () => {
    const worship = NAV_PRIMARY.find((i) => i.label === "예배·설교");
    expect(worship?.children?.map((c) => c.href)).toEqual(["/worship", "/sermons", "/challenges"]);
  });
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/constants/navigation.test.ts`
Expected: FAIL — `["/worship", "/sermons"]` ≠ 기대값.

- [ ] **Step 3: 구현 (4개 파일 수정)**

`src/constants/navigation.ts` — NavIconKey 유니온에 `| "bookOpenCheck"` 추가(“bookOpen” 아래), WORSHIP_LINKS에:

```ts
const WORSHIP_LINKS: NavLink[] = [
  { label: "예배시간", href: "/worship", icon: "calendarClock" },
  { label: "설교", href: "/sermons", icon: "bookOpen" },
  { label: "성경통독", href: "/challenges", icon: "bookOpenCheck" },
];
```

`src/components/shell/MegaMenu.tsx` — lucide import에 `BookOpenCheck` 추가, ICONS에 `bookOpenCheck: BookOpenCheck,` 추가.

`src/constants/permissions.ts` — PERMISSION_LABELS에:

```ts
  CHALLENGE_MANAGE: "통독 챌린지 관리",
  CHALLENGE_PARTICIPATE: "통독 챌린지 참여",
```

`src/app/globals.css` — `@theme`의 `--color-on-dark-soft` 아래에:

```css
  --color-primary-on-dark: #4d82ff;  /* 다크 밴드 위 액센트 — #0052ff는 다크 위 대비 부족(challenge-today-band 전용) */
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/constants/navigation.test.ts`
Expected: PASS (기존 테스트 포함 전부)

- [ ] **Step 5: DESIGN.md 컴포넌트 등록** (`### 콘텐츠 카드` 구획들과 나란히, `### 어드민 공용` 위에 새 구획 `### 성경통독 챌린지` 추가)

```markdown
### 성경통독 챌린지

- **`challenge-today-band`**: 챌린지 상세의 "오늘의 통독" 다크 밴드(C-2 몰입형). `{colors.surface-dark}` 배경 +
  on-dark 텍스트, 모바일 좌우 풀블리드. 초대형 타이포 `{typography.display-xl}`(모바일 clamp 축소), 구절 강조는
  `{colors.primary-on-dark}`(#0052ff의 다크 위 대비 보정 — 이 밴드 전용). CTA "다 읽었어요"는 풀폭(모바일)
  56px primary 필. 기록 완료 상태는 밴드 내 반투명 카드 + `{rounded.full}` 체크 플레이트. 문구는 일상어만
  (스트릭→"N일 연속으로 읽고 있어요", 페이스→"목표보다 N일 빨라요"). UPCOMING=D-day, ENDED=완주 응원 문구.
- **`reading-calendar`**: 벽걸이 달력식 월 그리드(히트맵 아님, EventCalendar의 monthMatrix 재사용). 읽은 날
  `{colors.primary-soft}` 채움 + ✓ + 장 수, 오늘 `{colors.primary}` 2px 테두리, 셀 `{rounded.sm}`. 셀 탭 =
  기록/취소 다이얼로그 입구(시작일~오늘 범위만 활성). 월 이동은 챌린지 시작월~현재월.
- **`challenge-feature-card`**: 목록 상단 피처 카드. 참여 중 ONGOING = 다크 미니 밴드(오늘 읽을 곳·진행 요약 +
  "오늘 기록하러 가기") / 미참여 ONGOING = 참여 CTA. `{rounded.xl}`, 카드 그리드보다 큰 단일 카드.
```

- [ ] **Step 6: 커밋**

```bash
git add src/constants/navigation.ts src/constants/navigation.test.ts src/components/shell/MegaMenu.tsx \
  src/constants/permissions.ts src/app/globals.css .claude/rules/DESIGN.md
git commit -m "feat : 성경통독 네비 진입점·권한 라벨·다크 액센트 토큰 추가 #88"
```

---

### Task 5: `ChallengeGate` + 쿼리·뮤테이션 훅 `queries.ts`

**Files:**
- Create: `src/components/challenges/ChallengeGate.tsx`
- Create: `src/components/challenges/queries.ts`
- Test: `src/components/challenges/ChallengeGate.test.tsx`
- Test: `src/components/challenges/queries.test.tsx`

**Interfaces:**
- Consumes: Task 2의 fetch 함수들, `useAuthStore`/`useHasHydrated`, `useMe`, `hasPermission`, `sanitizeNext`
- Produces:
  - `ChallengeGate({ children })` — CHALLENGE_PARTICIPATE 게이트(GalleryGate 동형)
  - `useChallenges(params: { page?: number })` → `Page<ChallengeCardResponse>`
  - `useChallenge(id: number)` → `ChallengeDetailResponse`
  - `useMyProgress(id: number, enabled: boolean)` → `MyProgressResponse` (키 `["challenge", id, "progress"]`)
  - `useMyLogs(id: number, month: { from: string; to: string })` → `ReadingLogResponse[]` (키 `["challenge", id, "logs", month]`)
  - `useMyParticipations(page: number)` → `Page<MyParticipationResponse>` (키 `["my-participations", page]`)
  - `useJoinChallenge(id)`, `useRecordRead(id)`, `useCancelRead(id)` — 뮤테이션(onSuccess에서 progress setQueryData + logs·detail·participations invalidate). 각 훅은 `onError`를 옵션으로 받지 않고 **호출측이 mutate의 콜백으로 처리**(RHF 인라인 에러 등 컨텍스트 의존).

- [ ] **Step 1: ChallengeGate 실패 테스트 작성** (GalleryGate.test 동형 — 문구만 챌린지)

```tsx
// src/components/challenges/ChallengeGate.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { useMeMock } = vi.hoisted(() => ({ useMeMock: vi.fn() }));
vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock }));
vi.mock("next/navigation", () => ({ usePathname: () => "/challenges" }));

import { ChallengeGate } from "./ChallengeGate";
import { useAuthStore } from "@/lib/auth/authStore";

const Child = () => <div>CHALLENGE CONTENT</div>;

beforeEach(() => {
  useMeMock.mockReset();
  useAuthStore.setState({ accessToken: null, refreshToken: null, member: null });
});

describe("ChallengeGate", () => {
  it("비로그인이면 로그인 안내 + children 차단", async () => {
    useMeMock.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    render(<ChallengeGate><Child /></ChallengeGate>);
    expect(await screen.findByText("로그인 후 이용 가능합니다")).toBeDefined();
    expect(screen.queryByText("CHALLENGE CONTENT")).toBeNull();
    expect(screen.getByRole("link", { name: "로그인" }).getAttribute("href")).toBe("/login?next=%2Fchallenges");
  });

  it("로그인+로딩이면 스켈레톤", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    render(<ChallengeGate><Child /></ChallengeGate>);
    await waitFor(() => expect(screen.queryByText("CHALLENGE CONTENT")).toBeNull());
    expect(screen.getByTestId("challenge-skeleton")).toBeDefined();
  });

  it("에러면 다시 시도 안내", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch: vi.fn() });
    render(<ChallengeGate><Child /></ChallengeGate>);
    expect(await screen.findByText("정보를 불러오지 못했습니다")).toBeDefined();
  });

  it("권한 없으면 교인 승인 안내 + 차단", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: { permissions: [] }, isPending: false, isError: false, refetch: vi.fn() });
    render(<ChallengeGate><Child /></ChallengeGate>);
    expect(await screen.findByText("교인 승인 후 이용 가능합니다")).toBeDefined();
    expect(screen.queryByText("CHALLENGE CONTENT")).toBeNull();
  });

  it("CHALLENGE_PARTICIPATE 보유면 children 렌더", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: { permissions: ["CHALLENGE_PARTICIPATE"] }, isPending: false, isError: false, refetch: vi.fn() });
    render(<ChallengeGate><Child /></ChallengeGate>);
    expect(await screen.findByText("CHALLENGE CONTENT")).toBeDefined();
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm test src/components/challenges/ChallengeGate.test.tsx` → FAIL(모듈 없음)

- [ ] **Step 3: ChallengeGate 구현** (GalleryGate 동형 — 분기 순서 동일: hydrated → !accessToken → isPending → isError → 권한)

```tsx
// src/components/challenges/ChallengeGate.tsx
"use client";
import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { useAuthStore, useHasHydrated } from "@/lib/auth/authStore";
import { useMe } from "@/lib/auth/useMe";
import { hasPermission } from "@/lib/auth/permissions";
import { sanitizeNext } from "@/lib/auth/nextParam";

// 챌린지 회원전용 게이트(GalleryGate 동형, 스펙 §2). 권한 없으면 children 미마운트 → API 호출 0회.
// 분기 순서 중요: useMe는 enabled:!!accessToken이라 !accessToken을 isPending보다 먼저 평가.
export function ChallengeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHasHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: me, isPending, isError, refetch } = useMe();

  if (!hydrated) return <ChallengeSkeleton />;
  if (!accessToken) {
    return (
      <ChallengeNotice
        title="로그인 후 이용 가능합니다"
        body="성경통독 챌린지는 교인 전용입니다. 로그인해 주세요."
        action={
          <Link href={`/login?next=${encodeURIComponent(sanitizeNext(pathname))}`} className={buttonVariants("primary")}>
            로그인
          </Link>
        }
      />
    );
  }
  if (isPending) return <ChallengeSkeleton />;
  if (isError || !me) {
    return (
      <ChallengeNotice
        title="정보를 불러오지 못했습니다"
        body="잠시 후 다시 시도해 주세요."
        action={<Button variant="secondary" onClick={() => refetch()}>다시 시도</Button>}
      />
    );
  }
  if (!hasPermission("CHALLENGE_PARTICIPATE", me)) {
    return (
      <ChallengeNotice
        title="교인 승인 후 이용 가능합니다"
        body="통독 챌린지 참여는 교인 승인(MEMBER) 후 가능합니다. 교회로 문의해 주세요."
      />
    );
  }
  return <>{children}</>;
}

function ChallengeSkeleton() {
  return (
    <div data-testid="challenge-skeleton" className="mt-xl flex flex-col gap-lg" aria-hidden>
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

function ChallengeNotice({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div role="status" className="mt-xl flex flex-col items-center gap-sm py-xxl text-center">
      <p className={cn(typo.titleMd, "text-ink")}>{title}</p>
      <p className={cn(typo.bodyMd, "text-muted")}>{body}</p>
      {action ? <div className="mt-sm">{action}</div> : null}
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인** — `pnpm test src/components/challenges/ChallengeGate.test.tsx` → PASS

- [ ] **Step 5: queries.ts 실패 테스트 작성** (뮤테이션 캐시 전략이 핵심 — read 성공 시 progress가 setQueryData로 즉시 반영되고 logs·participations가 invalidate되는지)

```tsx
// src/components/challenges/queries.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { recordReadMock, joinMock, cancelMock } = vi.hoisted(() => ({
  recordReadMock: vi.fn(), joinMock: vi.fn(), cancelMock: vi.fn(),
}));
vi.mock("@/lib/api/challenges", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  recordRead: recordReadMock, joinChallenge: joinMock, cancelRead: cancelMock,
}));

import { useRecordRead } from "./queries";

const progress = {
  progressRate: 36, currentPosition: { book: "마태복음", chapter: 8 }, chaptersRead: 93,
  totalChapters: 260, todayChapters: 4, dailyGoal: 4, todayDone: true, streakDays: 24,
  roundsCompleted: 0, paceDays: 3,
  challenge: { id: 1, title: "T", startDate: "2026-01-05", endDate: "2026-03-10", status: "ONGOING", totalChapters: 260 },
};

let qc: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
);

describe("useRecordRead", () => {
  it("성공 시 progress 캐시를 응답으로 교체하고 logs·detail·participations를 invalidate", async () => {
    recordReadMock.mockResolvedValue(progress);
    const spy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useRecordRead(1), { wrapper });
    result.current.mutate({});
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(qc.getQueryData(["challenge", 1, "progress"])).toEqual(progress);
    expect(spy).toHaveBeenCalledWith({ queryKey: ["challenge", 1, "logs"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["challenge", 1], exact: true });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["my-participations"] });
  });
});
```

- [ ] **Step 6: 실패 확인** — `pnpm test src/components/challenges/queries.test.tsx` → FAIL(모듈 없음)

- [ ] **Step 7: queries.ts 구현**

```ts
// src/components/challenges/queries.ts
"use client";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  fetchChallenges, fetchChallenge, fetchMyProgress, fetchMyLogs, fetchMyParticipations,
  joinChallenge, recordRead, cancelRead,
} from "@/lib/api/challenges";
import type { MyProgressResponse } from "@/lib/api/types";

// 게이트 통과 후에만 마운트(게이트가 통제). retry:false — 401 재시도는 authFetch 전담(갤러리 컨벤션).
export function useChallenges(params: { page?: number }) {
  return useQuery({
    queryKey: ["challenges", params],
    queryFn: () => fetchChallenges(params),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useChallenge(id: number) {
  return useQuery({ queryKey: ["challenge", id], queryFn: () => fetchChallenge(id), retry: false });
}

// joined일 때만 호출(미참여 404 방지 — 스펙 §3). 자정 경계는 refetchOnWindowFocus(기본값)로 자연 갱신.
export function useMyProgress(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["challenge", id, "progress"],
    queryFn: () => fetchMyProgress(id),
    enabled,
    retry: false,
  });
}

// month = 표시 중인 월의 {from,to}(YYYY-MM-DD) — 월별 캐시(스펙 §3·§4).
export function useMyLogs(id: number, month: { from: string; to: string }, enabled: boolean) {
  return useQuery({
    queryKey: ["challenge", id, "logs", month],
    queryFn: () => fetchMyLogs(id, month),
    enabled,
    retry: false,
  });
}

export function useMyParticipations(page: number, enabled = true) {
  return useQuery({
    queryKey: ["my-participations", page],
    queryFn: () => fetchMyParticipations({ page }),
    placeholderData: keepPreviousData,
    enabled,
    retry: false,
  });
}

// 쓰기 3종 공통 onSuccess: 응답이 완전한 대시보드라 progress는 setQueryData(재요청 0),
// 달력·joined 플래그·마이페이지 숫자만 invalidate(스펙 §1·§3). 낙관적 업데이트 안 씀.
function useProgressMutation<TVars>(id: number, fn: (vars: TVars) => Promise<MyProgressResponse>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (progress) => {
      qc.setQueryData(["challenge", id, "progress"], progress);
      qc.invalidateQueries({ queryKey: ["challenge", id, "logs"] });
      qc.invalidateQueries({ queryKey: ["challenge", id], exact: true });
      qc.invalidateQueries({ queryKey: ["my-participations"] });
    },
  });
}

export function useJoinChallenge(id: number) {
  return useProgressMutation<void>(id, () => joinChallenge(id));
}

export function useRecordRead(id: number) {
  return useProgressMutation<{ chapters?: number; date?: string }>(id, (body) => recordRead(id, body));
}

export function useCancelRead(id: number) {
  return useProgressMutation<{ date?: string }>(id, ({ date }) => cancelRead(id, date));
}
```

- [ ] **Step 8: 통과 확인** — `pnpm test src/components/challenges/` → PASS (Gate + queries)

- [ ] **Step 9: 커밋**

```bash
git add src/components/challenges/
git commit -m "feat : 챌린지 게이트 및 쿼리·뮤테이션 훅 추가 #88"
```

---

### Task 6: `TodayBand` — 오늘의 통독 다크 밴드 (C-2)

**Files:**
- Create: `src/components/challenges/TodayBand.tsx`
- Test: `src/components/challenges/TodayBand.test.tsx`

**Interfaces:**
- Consumes: `locate`, `bookName` (Task 1), `MyProgressResponse`·`ChallengeDetailResponse` (Task 2)
- Produces: `TodayBand({ detail, progress, pending, onReadToday, onAdjust, onBackfill, onCancelToday })` — 프레젠테이션 전용(뮤테이션은 ChallengeDetail 소관).
  - `detail: ChallengeDetailResponse` (startBook 필요 — progress.challenge 요약엔 없음)
  - `progress: MyProgressResponse`
  - `pending: boolean` (기록/취소 진행 중 — 버튼 비활성)
  - `onReadToday(): void` (기본값 기록), `onAdjust(): void` (장 수 다이얼로그), `onBackfill(): void` (달력으로 스크롤), `onCancelToday(): void`
- 내부 파생: 오늘 범위 = `locate(startBook, chaptersRead+1)` ~ `locate(startBook, min(chaptersRead+남은목표, totalChapters))`, 남은목표 = `max(dailyGoal - todayChapters, 0)`

- [ ] **Step 1: 실패하는 테스트 작성** (5상태 — 스펙 §4 TodayBand 상태표)

```tsx
// src/components/challenges/TodayBand.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TodayBand } from "./TodayBand";
import type { ChallengeDetailResponse, MyProgressResponse } from "@/lib/api/types";

const detail: ChallengeDetailResponse = {
  id: 1, title: "2026 신약 통독", startBook: 40, endBook: 66, startDate: "2026-01-05",
  endDate: "2026-03-10", targetDays: 65, totalChapters: 260, dailyGoal: 4,
  status: "ONGOING", joined: true, version: 0, description: null,
};
const base: MyProgressResponse = {
  progressRate: 34.2, currentPosition: { book: "마태복음", chapter: 4 }, chaptersRead: 4,
  totalChapters: 260, todayChapters: 0, dailyGoal: 4, todayDone: false, streakDays: 23,
  roundsCompleted: 0, paceDays: 3,
  challenge: { id: 1, title: "2026 신약 통독", startDate: "2026-01-05", endDate: "2026-03-10", status: "ONGOING", totalChapters: 260 },
};
const noop = { onReadToday: vi.fn(), onAdjust: vi.fn(), onBackfill: vi.fn(), onCancelToday: vi.fn() };

describe("TodayBand", () => {
  it("기록 전: 오늘 범위 초대형 표기 + 다 읽었어요 버튼 + 일상어 통계", () => {
    render(<TodayBand detail={detail} progress={base} pending={false} {...noop} />);
    expect(screen.getByText("마태복음 5~8장")).toBeDefined(); // chaptersRead 4 → 5장부터 4장
    const btn = screen.getByRole("button", { name: "다 읽었어요" });
    fireEvent.click(btn);
    expect(noop.onReadToday).toHaveBeenCalled();
    expect(screen.getByText(/23일 연속으로 읽고 있어요/)).toBeDefined();
    expect(screen.getByText(/목표보다 3일 빨라요/)).toBeDefined();
    expect(screen.getByText(/260장 중 4장/)).toBeDefined();
  });

  it("권 경계 넘는 범위는 양끝 권 표기", () => {
    render(<TodayBand detail={detail} progress={{ ...base, chaptersRead: 26, currentPosition: { book: "마태복음", chapter: 26 } }} pending={false} {...noop} />);
    expect(screen.getByText("마태복음 27장 ~ 마가복음 2장")).toBeDefined(); // 마태 28장 경계 이월
  });

  it("기록 후(todayDone): 완료 카드 + 내일 안내 + 취소 버튼", () => {
    render(<TodayBand detail={detail} progress={{ ...base, todayChapters: 4, todayDone: true, chaptersRead: 8, streakDays: 24 }} pending={false} {...noop} />);
    expect(screen.getByText("오늘 4장을 다 읽었어요")).toBeDefined();
    expect(screen.getByText(/내일은 마태복음 9장부터예요/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "오늘 기록 취소" }));
    expect(noop.onCancelToday).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "다 읽었어요" })).toBeNull();
  });

  it("UPCOMING: 시작 안내, 기록 버튼 없음", () => {
    const up = { ...base, challenge: { ...base.challenge, status: "UPCOMING" as const }, chaptersRead: 0, currentPosition: null };
    render(<TodayBand detail={{ ...detail, status: "UPCOMING" }} progress={up} pending={false} {...noop} />);
    expect(screen.getByText(/1월 5일에 시작해요/)).toBeDefined();
    expect(screen.queryByRole("button", { name: "다 읽었어요" })).toBeNull();
  });

  it("ENDED: 완주 응원 문구 + 기록은 계속 허용 + 페이스 줄 생략", () => {
    const ended = { ...base, paceDays: null, challenge: { ...base.challenge, status: "ENDED" as const } };
    render(<TodayBand detail={{ ...detail, status: "ENDED" }} progress={ended} pending={false} {...noop} />);
    expect(screen.getByText(/종료된 챌린지예요/)).toBeDefined();
    expect(screen.getByRole("button", { name: "다 읽었어요" })).toBeDefined(); // 늦은 완주 응원(스펙 §4)
    expect(screen.queryByText(/목표보다/)).toBeNull();
  });

  it("완독(roundsCompleted ≥ 1): 회차 문구", () => {
    render(<TodayBand detail={detail} progress={{ ...base, roundsCompleted: 1 }} pending={false} {...noop} />);
    expect(screen.getByText(/1회 완독 · 2회차 진행 중/)).toBeDefined();
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm test src/components/challenges/TodayBand.test.tsx` → FAIL(모듈 없음)

- [ ] **Step 3: 구현**

```tsx
// src/components/challenges/TodayBand.tsx
"use client";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { locate } from "@/constants/bible";
import type { ChallengeDetailResponse, MyProgressResponse } from "@/lib/api/types";

interface TodayBandProps {
  detail: ChallengeDetailResponse;
  progress: MyProgressResponse;
  pending: boolean;
  onReadToday: () => void;
  onAdjust: () => void;
  onBackfill: () => void;
  onCancelToday: () => void;
}

// 오늘 읽을 범위 라벨 — currentPosition(마지막 읽은 장)의 다음 장부터 남은 목표만큼(스펙 §4).
function todayRangeLabel(detail: ChallengeDetailResponse, progress: MyProgressResponse, remaining: number): string {
  const startOrdinal = Math.min(progress.chaptersRead + 1, progress.totalChapters);
  const endOrdinal = Math.min(progress.chaptersRead + Math.max(remaining, 1), progress.totalChapters);
  const s = locate(detail.startBook, startOrdinal);
  const e = locate(detail.startBook, endOrdinal);
  if (s.book === e.book) return s.chapter === e.chapter ? `${s.book} ${s.chapter}장` : `${s.book} ${s.chapter}~${e.chapter}장`;
  return `${s.book} ${s.chapter}장 ~ ${e.book} ${e.chapter}장`;
}

// challenge-today-band(DESIGN.md): 다크 밴드 + 초대형 타이포. 문구는 일상어만 — 전문용어 금지.
export function TodayBand({ detail, progress, pending, onReadToday, onAdjust, onBackfill, onCancelToday }: TodayBandProps) {
  const status = detail.status;
  const remaining = Math.max(progress.dailyGoal - progress.todayChapters, 0);
  const percent = Math.round(progress.progressRate);
  const nextPos = locate(detail.startBook, Math.min(progress.chaptersRead + 1, progress.totalChapters));

  // "1월 5일에 시작해요" — formatDate("2026. 1. 5.")는 조사와 어색해 월·일만 직접 표기.
  const [, sm, sd] = detail.startDate.split("-").map(Number);

  return (
    <section className="rounded-xl bg-surface-dark px-lg py-xxl text-center">
      {status === "UPCOMING" ? (
        <p className={cn(typo.displayMd, "text-on-dark")}>{sm}월 {sd}일에 시작해요</p>
      ) : (
        <>
          {status === "ENDED" ? (
            <p className={cn(typo.bodySm, "text-on-dark-soft")}>종료된 챌린지예요. 끝까지 완주해요!</p>
          ) : null}
          {progress.todayDone ? (
            <div className="mx-auto flex max-w-md items-center gap-md rounded-xl bg-surface-dark-elevated p-lg text-left">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary">
                <Check size={24} className="text-on-primary" aria-hidden />
              </span>
              <span>
                <span className={cn(typo.titleSm, "block text-on-dark")}>오늘 {progress.todayChapters}장을 다 읽었어요</span>
                <span className={cn(typo.bodySm, "text-on-dark-soft")}>내일은 {nextPos.book} {nextPos.chapter}장부터예요</span>
              </span>
            </div>
          ) : (
            <>
              <p className={cn(typo.bodySm, "text-on-dark-soft")}>오늘 읽을 곳</p>
              <p className={cn(typo.displayXl, "mt-sm text-on-dark")}>
                {todayRangeLabel(detail, progress, remaining)}
              </p>
              <p className={cn(typo.bodySm, "mt-xs text-on-dark-soft")}>오늘 {remaining}장을 읽어요</p>
              <Button
                variant="primary"
                loading={pending}
                onClick={onReadToday}
                className="mt-lg h-14 w-full max-w-md"
              >
                다 읽었어요
              </Button>
            </>
          )}
          <div className={cn(typo.bodySm, "mt-md flex justify-center gap-md text-on-dark-soft")}>
            {progress.todayDone ? (
              <>
                <button type="button" onClick={onAdjust} className="underline-offset-4 hover:underline">더 읽었어요</button>
                <button type="button" disabled={pending} onClick={onCancelToday} className="underline-offset-4 hover:underline">오늘 기록 취소</button>
              </>
            ) : (
              <>
                <button type="button" onClick={onAdjust} className="underline-offset-4 hover:underline">읽은 장 수 바꾸기</button>
                <button type="button" onClick={onBackfill} className="underline-offset-4 hover:underline">지난 날짜 기록</button>
              </>
            )}
          </div>
        </>
      )}

      {/* 진행바 + 문장형 통계(일상어) */}
      <div className="mx-auto mt-xl max-w-md">
        <div className="h-2 overflow-hidden rounded-full bg-surface-dark-elevated" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary-on-dark" style={{ width: `${Math.min(percent, 100)}%` }} />
        </div>
        <div className={cn(typo.bodySm, "mt-md text-on-dark-soft leading-relaxed")}>
          <p>{progress.totalChapters}장 중 <b className="text-on-dark">{progress.chaptersRead}장</b> 읽었어요 ({percent}%)</p>
          {progress.streakDays > 0 ? (
            <p><b className="text-on-dark">{progress.streakDays}일 연속</b>으로 읽고 있어요</p>
          ) : null}
          {progress.paceDays != null && progress.paceDays !== 0 ? (
            <p>목표보다 <b className="text-on-dark">{Math.abs(progress.paceDays)}일 {progress.paceDays > 0 ? "빨라요" : "늦어요"}</b></p>
          ) : null}
          {progress.roundsCompleted >= 1 ? (
            <p className="text-primary-on-dark">{progress.roundsCompleted}회 완독 · {progress.roundsCompleted + 1}회차 진행 중</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
```

주의: `style={{ width }}`는 진행률 동적 값이라 인라인 허용(토큰이 표현 불가한 데이터 구동 값). 모바일 풀블리드는 1차에서 생략(rounded-xl 카드 밴드로 통일) — 시각 확인 후 필요하면 후속.

- [ ] **Step 4: 통과 확인** — `pnpm test src/components/challenges/TodayBand.test.tsx` → PASS

- [ ] **Step 5: 커밋 없음** — Task 8에서 상세 페이지와 묶어 커밋.

---

### Task 7: `ReadDialog` + `ReadingCalendar`

**Files:**
- Create: `src/components/challenges/schema.ts`
- Create: `src/components/challenges/ReadDialog.tsx`
- Create: `src/components/challenges/ReadingCalendar.tsx`
- Test: `src/components/challenges/ReadDialog.test.tsx`
- Test: `src/components/challenges/ReadingCalendar.test.tsx`

**Interfaces:**
- Consumes: `monthMatrix`·`kstCivilFromDate`·`civilKey`·`CivilDate` (`@/lib/calendar`), `ReadingLogResponse`
- Produces:
  - `readSchema` (zod): `{ chapters: number }` — 정수 1~1189, 메시지 "1장 이상 입력해 주세요." / "1189장 이하로 입력해 주세요."
  - `ReadDialogTarget = { date: string; label: string; existing: number | null; defaultChapters: number }`
  - `ReadDialog({ target, onOpenChange, pending, error, onRecord, onCancelRecord })` — `target null`이면 닫힘. `onRecord(date, chapters)`, `onCancelRecord(date)`. `error?: string`은 서버 400 인라인 표시(INVALID_INPUT_VALUE detail).
  - `ReadingCalendar({ startDate, endDate, logs, year, month, onMonthChange, onSelectDay })` — `onSelectDay(date: string, existing: number | null)`. 시작월~현재월만 이동, 활성 날짜 = [startDate, 오늘].

- [ ] **Step 1: ReadDialog 실패 테스트**

```tsx
// src/components/challenges/ReadDialog.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReadDialog } from "./ReadDialog";

const base = { onOpenChange: vi.fn(), pending: false, onRecord: vi.fn(), onCancelRecord: vi.fn() };

describe("ReadDialog", () => {
  it("기록 모드: 기본값=남은 목표, 저장 시 onRecord(date, chapters)", async () => {
    const onRecord = vi.fn();
    render(<ReadDialog {...base} onRecord={onRecord} target={{ date: "2026-01-20", label: "1월 20일", existing: null, defaultChapters: 4 }} />);
    const input = screen.getByLabelText("읽은 장 수") as HTMLInputElement;
    expect(input.value).toBe("4");
    fireEvent.change(input, { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "기록하기" }));
    await waitFor(() => expect(onRecord).toHaveBeenCalledWith("2026-01-20", 6));
  });

  it("0 이하 입력이면 검증 에러, onRecord 미호출", async () => {
    const onRecord = vi.fn();
    render(<ReadDialog {...base} onRecord={onRecord} target={{ date: "2026-01-20", label: "1월 20일", existing: null, defaultChapters: 4 }} />);
    fireEvent.change(screen.getByLabelText("읽은 장 수"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "기록하기" }));
    expect(await screen.findByText("1장 이상 입력해 주세요.")).toBeDefined();
    expect(onRecord).not.toHaveBeenCalled();
  });

  it("기존 기록 있는 날: 요약 + 기록 취소 버튼", () => {
    const onCancelRecord = vi.fn();
    render(<ReadDialog {...base} onCancelRecord={onCancelRecord} target={{ date: "2026-01-19", label: "1월 19일", existing: 5, defaultChapters: 4 }} />);
    expect(screen.getByText(/5장 읽음/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "기록 취소" }));
    expect(onCancelRecord).toHaveBeenCalledWith("2026-01-19");
  });

  it("서버 에러 문자열 인라인 표시", () => {
    render(<ReadDialog {...base} error="기록 가능한 날짜가 아닙니다." target={{ date: "2026-01-20", label: "1월 20일", existing: null, defaultChapters: 4 }} />);
    expect(screen.getByText("기록 가능한 날짜가 아닙니다.")).toBeDefined();
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm test src/components/challenges/ReadDialog.test.tsx` → FAIL

- [ ] **Step 3: schema.ts + ReadDialog 구현**

```ts
// src/components/challenges/schema.ts
import { z } from "zod";

// 장 수 입력 — 백엔드 ChallengeReadRequest.chapters(1~1189)와 동일 범위. zod v4: 커스텀 메시지는 두 번째 인자.
export const readSchema = z.object({
  chapters: z.coerce.number().int("정수로 입력해 주세요.")
    .min(1, "1장 이상 입력해 주세요.")
    .max(1189, "1189장 이하로 입력해 주세요."),
});
export type ReadFormValues = z.infer<typeof readSchema>;
```

```tsx
// src/components/challenges/ReadDialog.tsx
"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { readSchema, type ReadFormValues } from "./schema";

export interface ReadDialogTarget {
  date: string; // "YYYY-MM-DD"
  label: string; // "1월 20일" — 제목 표기
  existing: number | null; // 그날 이미 기록한 장 수(없으면 null → 기록 모드)
  defaultChapters: number; // 기록 모드 기본값 = 하루 목표(남은 목표)
}

interface ReadDialogProps {
  target: ReadDialogTarget | null;
  onOpenChange: (v: boolean) => void;
  pending: boolean;
  error?: string; // 서버 400(INVALID_INPUT_VALUE) detail 인라인 표시(스펙 §7)
  onRecord: (date: string, chapters: number) => void;
  onCancelRecord: (date: string) => void;
}

// 오늘/과거 공용 기록·취소 다이얼로그 — 달력 탭 = 입구(스펙 §4). 어르신 대상: 화면당 액션 1개 원칙.
export function ReadDialog({ target, onOpenChange, pending, error, onRecord, onCancelRecord }: ReadDialogProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReadFormValues>({
    resolver: zodResolver(readSchema),
    defaultValues: { chapters: target?.defaultChapters ?? 1 },
  });

  // 열릴 때마다 기본값 리셋(TagFormDialog 선례 — effect+reset만).
  useEffect(() => {
    if (target) reset({ chapters: target.defaultChapters });
  }, [target, reset]);

  return (
    <Dialog open={target != null} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{target ? `${target.label} 읽기 기록` : "읽기 기록"}</DialogTitle>
        </DialogHeader>
        {target?.existing != null ? (
          <div className="flex flex-col gap-base">
            <p className={cn(typo.bodyMd, "text-ink")}>이날 {target.existing}장 읽음으로 기록되어 있어요.</p>
            {error ? <p className={cn(typo.caption, "text-error")}>{error}</p> : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="tertiary">닫기</Button>
              </DialogClose>
              <Button type="button" variant="secondary" loading={pending} onClick={() => onCancelRecord(target.date)}>
                기록 취소
              </Button>
            </DialogFooter>
          </div>
        ) : target ? (
          <form
            onSubmit={handleSubmit((v) => onRecord(target.date, v.chapters))}
            className="flex flex-col gap-base"
          >
            <div className="flex flex-col gap-xxs">
              <label htmlFor="read-chapters" className={cn(typo.bodySm, "text-body")}>읽은 장 수</label>
              <Input
                id="read-chapters" type="number" inputMode="numeric" min={1} step={1}
                error={errors.chapters?.message ?? error}
                {...register("chapters")}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="tertiary">취소</Button>
              </DialogClose>
              <Button type="submit" variant="primary" loading={pending}>기록하기</Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: 통과 확인** — `pnpm test src/components/challenges/ReadDialog.test.tsx` → PASS

- [ ] **Step 5: ReadingCalendar 실패 테스트**

```tsx
// src/components/challenges/ReadingCalendar.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReadingCalendar } from "./ReadingCalendar";

// 오늘을 2026-01-27(KST)로 고정 — 활성 범위·오늘 표시 검증.
vi.useFakeTimers();
vi.setSystemTime(new Date("2026-01-27T03:00:00+09:00"));

const props = {
  startDate: "2026-01-05", endDate: "2026-03-10",
  logs: [{ readDate: "2026-01-20", chapters: 5 }, { readDate: "2026-01-26", chapters: 4 }],
  year: 2026, month: 1,
  onMonthChange: vi.fn(), onSelectDay: vi.fn(),
};

describe("ReadingCalendar", () => {
  it("읽은 날 ✓+장 수, 탭하면 onSelectDay(date, existing)", () => {
    render(<ReadingCalendar {...props} />);
    const read = screen.getByRole("button", { name: "1월 20일 · 5장 읽음" });
    fireEvent.click(read);
    expect(props.onSelectDay).toHaveBeenCalledWith("2026-01-20", 5);
  });

  it("빈 날(범위 내) 탭하면 onSelectDay(date, null)", () => {
    render(<ReadingCalendar {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "1월 21일 · 기록 없음" }));
    expect(props.onSelectDay).toHaveBeenCalledWith("2026-01-21", null);
  });

  it("미래·시작 전 날짜는 비활성", () => {
    render(<ReadingCalendar {...props} />);
    expect((screen.getByRole("button", { name: "1월 28일 · 기록 없음" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "1월 4일 · 기록 없음" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("현재 월에서는 다음 달 비활성, 시작월이면 이전 달도 비활성", () => {
    render(<ReadingCalendar {...props} />);
    expect((screen.getByRole("button", { name: "다음 달" }) as HTMLButtonElement).disabled).toBe(true);
    // startDate 2026-01-05 → 시작월 == 현재월(1월)이라 이전 달도 잠김
    expect((screen.getByRole("button", { name: "이전 달" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("시작월이 이전 달이면 이전 달 이동 가능", () => {
    render(<ReadingCalendar {...props} startDate="2025-12-20" />);
    const prevBtn = screen.getByRole("button", { name: "이전 달" }) as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(false);
    fireEvent.click(prevBtn);
    expect(props.onMonthChange).toHaveBeenCalledWith(2025, 12);
  });
});
```

- [ ] **Step 6: 실패 확인** — `pnpm test src/components/challenges/ReadingCalendar.test.tsx` → FAIL

- [ ] **Step 7: ReadingCalendar 구현**

```tsx
// src/components/challenges/ReadingCalendar.tsx
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
export function ReadingCalendar({ startDate, endDate, logs, year, month, onMonthChange, onSelectDay }: ReadingCalendarProps) {
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
```

주의: `vi.useFakeTimers()`는 파일 최상단(모듈 스코프)에서 호출해야 `new Date()`가 고정된다. `cn()` 내부의 `&&` 조합은 허용 규칙.

- [ ] **Step 8: 통과 확인** — `pnpm test src/components/challenges/ReadingCalendar.test.tsx` → PASS

- [ ] **Step 9: 커밋 없음** — Task 8에서 상세 페이지와 묶어 커밋.

---

### Task 8: `ChallengeDetail` 조립 + 상세 라우트

**Files:**
- Create: `src/components/challenges/ChallengeDetail.tsx`
- Create: `src/app/(site)/challenges/[id]/page.tsx`
- Test: `src/components/challenges/ChallengeDetail.test.tsx`
- Test: `src/app/(site)/challenges/[id]/page.test.tsx`

**Interfaces:**
- Consumes: Task 5 훅 전부, Task 6 `TodayBand`, Task 7 `ReadDialog`·`ReadingCalendar`·`ReadDialogTarget`, `MarkdownContent`, `adminOnError`·`ApiError`, `Badge`, `formatDate`, `kstCivilFromDate`, `formatRange`
- Produces: `ChallengeDetail({ id: number })` — joined 분기 오케스트레이터(월 상태·다이얼로그 상태·뮤테이션 소유)

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// src/components/challenges/ChallengeDetail.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { fetchChallengeMock, fetchMyProgressMock, fetchMyLogsMock, joinMock, recordMock } = vi.hoisted(() => ({
  fetchChallengeMock: vi.fn(), fetchMyProgressMock: vi.fn(), fetchMyLogsMock: vi.fn(),
  joinMock: vi.fn(), recordMock: vi.fn(),
}));
vi.mock("@/lib/api/challenges", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchChallenge: fetchChallengeMock, fetchMyProgress: fetchMyProgressMock,
  fetchMyLogs: fetchMyLogsMock, joinChallenge: joinMock, recordRead: recordMock,
}));
// 마크다운 렌더는 별도 테스트 대상 — 소스 텍스트만 확인(테스트 관례: mock은 엘리먼트 반환).
vi.mock("@/components/common/MarkdownContent", () => ({
  MarkdownContent: ({ source }: { source: string }) => <div>{source}</div>,
}));

import { ChallengeDetail } from "./ChallengeDetail";

const detail = {
  id: 1, title: "2026 신약 통독", startBook: 40, endBook: 66, startDate: "2026-01-05",
  endDate: "2026-03-10", targetDays: 65, totalChapters: 260, dailyGoal: 4,
  status: "ONGOING", joined: false, version: 0, description: "함께 읽어요",
};
const progress = {
  progressRate: 34.2, currentPosition: { book: "마태복음", chapter: 4 }, chaptersRead: 4,
  totalChapters: 260, todayChapters: 0, dailyGoal: 4, todayDone: false, streakDays: 23,
  roundsCompleted: 0, paceDays: 3,
  challenge: { id: 1, title: "2026 신약 통독", startDate: "2026-01-05", endDate: "2026-03-10", status: "ONGOING", totalChapters: 260 },
};

let qc: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  fetchMyLogsMock.mockResolvedValue([]);
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
const renderDetail = () =>
  render(<QueryClientProvider client={qc}><ChallengeDetail id={1} /></QueryClientProvider>);

describe("ChallengeDetail", () => {
  it("미참여: 참여 CTA + 소개, progress 미호출", async () => {
    fetchChallengeMock.mockResolvedValue(detail);
    renderDetail();
    expect(await screen.findByRole("button", { name: "챌린지 참여하기" })).toBeDefined();
    expect(screen.getByText(/260장을 65일 동안, 하루 4장씩/)).toBeDefined();
    expect(screen.getByText("함께 읽어요")).toBeDefined();
    expect(fetchMyProgressMock).not.toHaveBeenCalled();
  });

  it("참여하기 클릭 → joinChallenge 호출", async () => {
    fetchChallengeMock.mockResolvedValue(detail);
    joinMock.mockResolvedValue(progress);
    renderDetail();
    fireEvent.click(await screen.findByRole("button", { name: "챌린지 참여하기" }));
    await waitFor(() => expect(joinMock).toHaveBeenCalledWith(1));
  });

  it("참여 중: TodayBand + 달력 렌더", async () => {
    fetchChallengeMock.mockResolvedValue({ ...detail, joined: true });
    fetchMyProgressMock.mockResolvedValue(progress);
    renderDetail();
    expect(await screen.findByRole("button", { name: "다 읽었어요" })).toBeDefined();
    expect(screen.getByText("읽기 달력")).toBeDefined();
  });

  it("다 읽었어요 → recordRead(빈 body: 서버 기본값)", async () => {
    fetchChallengeMock.mockResolvedValue({ ...detail, joined: true });
    fetchMyProgressMock.mockResolvedValue(progress);
    recordMock.mockResolvedValue({ ...progress, todayDone: true, todayChapters: 4, chaptersRead: 8 });
    renderDetail();
    fireEvent.click(await screen.findByRole("button", { name: "다 읽었어요" }));
    await waitFor(() => expect(recordMock).toHaveBeenCalledWith(1, {}));
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm test src/components/challenges/ChallengeDetail.test.tsx` → FAIL(모듈 없음)

- [ ] **Step 3: 구현**

```tsx
// src/components/challenges/ChallengeDetail.tsx
"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { ApiError } from "@/lib/auth/apiError";
import { formatDate } from "@/lib/date";
import { kstCivilFromDate } from "@/lib/calendar";
import { formatRange } from "@/constants/bible";
import { useChallenge, useMyProgress, useMyLogs, useJoinChallenge, useRecordRead, useCancelRead } from "./queries";
import { TodayBand } from "./TodayBand";
import { ReadingCalendar } from "./ReadingCalendar";
import { ReadDialog, type ReadDialogTarget } from "./ReadDialog";
import type { ChallengeStatus } from "@/lib/api/types";

export const STATUS_LABELS: Record<ChallengeStatus, string> = {
  UPCOMING: "예정", ONGOING: "진행 중", ENDED: "종료",
};

const monthRange = (y: number, m: number) => ({
  from: `${y}-${String(m).padStart(2, "0")}-01`,
  to: `${y}-${String(m).padStart(2, "0")}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`,
});
const civilToday = () => kstCivilFromDate(new Date());

export function ChallengeDetail({ id }: { id: number }) {
  const detail = useChallenge(id);
  const joined = detail.data?.joined ?? false;
  const progress = useMyProgress(id, joined); // joined일 때만 — 미참여 404 방지(스펙 §3)

  const [month, setMonth] = useState(() => {
    const t = civilToday();
    return { year: t.y, month: t.m };
  });
  const logs = useMyLogs(id, monthRange(month.year, month.month), joined);

  const [target, setTarget] = useState<ReadDialogTarget | null>(null);
  const [dialogError, setDialogError] = useState<string | undefined>();
  const calendarRef = useRef<HTMLDivElement>(null);

  const join = useJoinChallenge(id);
  const record = useRecordRead(id);
  const cancel = useCancelRead(id);
  const pending = record.isPending || cancel.isPending;

  // read 400(날짜 범위·장 수)은 다이얼로그 인라인, 나머지는 errorCode 토스트(스펙 §7).
  const onDialogError = (e: unknown) => {
    if (e instanceof ApiError && e.errorCode === "INVALID_INPUT_VALUE") setDialogError(e.detail ?? "입력값을 확인해 주세요.");
    else adminOnError()(e);
  };
  const closeDialog = () => { setTarget(null); setDialogError(undefined); };

  if (detail.isPending) {
    return (
      <div className="mt-xl flex flex-col gap-lg" aria-hidden>
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (detail.isError || !detail.data) {
    // 삭제된 챌린지(RESOURCE_NOT_FOUND) 포함 — 목록으로 탈출구 제공(스펙 §7).
    return (
      <div className="mt-xl flex flex-col items-center gap-sm py-xxl text-center" role="status">
        <p className={cn(typo.titleMd, "text-ink")}>챌린지를 불러오지 못했습니다</p>
        <div className="flex items-center gap-sm">
          <Button variant="secondary" onClick={() => detail.refetch()}>다시 시도</Button>
          <Link href="/challenges" className={buttonVariants("secondary")}>목록으로</Link>
        </div>
      </div>
    );
  }
  const c = detail.data;
  const remaining = progress.data ? Math.max(progress.data.dailyGoal - progress.data.todayChapters, 0) : c.dailyGoal;

  return (
    <div className="mt-xl flex flex-col gap-lg">
      <header>
        <div className="flex items-center gap-sm">
          <h1 className={cn(typo.displayMd, "text-ink")}>{c.title}</h1>
          <Badge variant={c.status === "ONGOING" ? "primary" : "default"}>{STATUS_LABELS[c.status]}</Badge>
        </div>
        <p className={cn(typo.datetime, "mt-xs text-muted")}>
          {formatDate(c.startDate)} ~ {formatDate(c.endDate)} · {formatRange(c.startBook, c.endBook)} {c.totalChapters}장
        </p>
      </header>

      {joined ? (
        progress.data ? (
          <TodayBand
            detail={c}
            progress={progress.data}
            pending={pending}
            onReadToday={() => record.mutate({}, { onError: adminOnError({ onReedit: () => progress.refetch() }) })}
            onAdjust={() => {
              const t = civilToday();
              setTarget({
                date: `${t.y}-${String(t.m).padStart(2, "0")}-${String(t.d).padStart(2, "0")}`,
                label: "오늘", existing: null, defaultChapters: Math.max(remaining, 1),
              });
            }}
            onBackfill={() => calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            onCancelToday={() => cancel.mutate({}, { onError: adminOnError({ onReedit: () => progress.refetch() }) })}
          />
        ) : (
          <Skeleton className="h-72 w-full rounded-xl" />
        )
      ) : (
        // 참여 전 CTA — TodayBand 자리의 다크 밴드(스펙 §4)
        <section className="rounded-xl bg-surface-dark px-lg py-xxl text-center">
          <p className={cn(typo.displayMd, "text-on-dark")}>
            {c.totalChapters}장을 {c.targetDays}일 동안, 하루 {c.dailyGoal}장씩
          </p>
          <Button
            variant="primary" loading={join.isPending}
            onClick={() => join.mutate(undefined, { onError: adminOnError({ onDuplicate: () => detail.refetch() }) })}
            className="mt-lg h-14 w-full max-w-md"
          >
            챌린지 참여하기
          </Button>
        </section>
      )}

      {joined ? (
        <div ref={calendarRef}>
          <ReadingCalendar
            startDate={c.startDate} endDate={c.endDate}
            logs={logs.data ?? []}
            year={month.year} month={month.month}
            onMonthChange={(year, m) => setMonth({ year, month: m })}
            onSelectDay={(date, existing) =>
              setTarget({
                date,
                label: `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`,
                existing,
                defaultChapters: Math.max(remaining, 1),
              })
            }
          />
        </div>
      ) : null}

      {c.description ? (
        <section className="rounded-xl border border-hairline p-xl">
          <MarkdownContent source={c.description} />
        </section>
      ) : null}

      <ReadDialog
        target={target}
        onOpenChange={(v) => { if (!v) closeDialog(); }}
        pending={pending}
        error={dialogError}
        onRecord={(date, chapters) =>
          record.mutate({ chapters, date }, { onSuccess: closeDialog, onError: onDialogError })}
        onCancelRecord={(date) =>
          cancel.mutate({ date }, { onSuccess: closeDialog, onError: onDialogError })}
      />
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인** — `pnpm test src/components/challenges/ChallengeDetail.test.tsx` → PASS

- [ ] **Step 5: 상세 라우트 + 페이지 테스트** (갤러리 `albums/[id]/page.tsx` 동형 — Next 16 params는 Promise)

```tsx
// src/app/(site)/challenges/[id]/page.tsx
import { Container } from "@/components/shell/Container";
import { ChallengeGate } from "@/components/challenges/ChallengeGate";
import { ChallengeDetail } from "@/components/challenges/ChallengeDetail";

// 회원 전용 — 서버 프리렌더 없음, 게이트 통과 후 클라이언트가 전부 조회(스펙 §2).
export default async function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Container as="section" className="py-section">
      <ChallengeGate>
        <ChallengeDetail id={Number(id)} />
      </ChallengeGate>
    </Container>
  );
}
```

```tsx
// src/app/(site)/challenges/[id]/page.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/challenges/ChallengeGate", () => ({
  ChallengeGate: ({ children }: { children: React.ReactNode }) => <div data-testid="gate">{children}</div>,
}));
vi.mock("@/components/challenges/ChallengeDetail", () => ({
  ChallengeDetail: ({ id }: { id: number }) => <div>DETAIL {id}</div>,
}));

import ChallengeDetailPage from "./page";

describe("ChallengeDetailPage", () => {
  it("게이트 안에서 id를 숫자로 넘겨 상세를 렌더", async () => {
    render(await ChallengeDetailPage({ params: Promise.resolve({ id: "7" }) }));
    expect(screen.getByTestId("gate")).toBeDefined();
    expect(screen.getByText("DETAIL 7")).toBeDefined();
  });
});
```

- [ ] **Step 6: 통과 확인** — `pnpm test "src/app/(site)/challenges/[id]/page.test.tsx"` → PASS

- [ ] **Step 7: 커밋 (상세 대시보드 묶음)**

Run: `npx tsc --noEmit` → 에러 0
```bash
git add src/components/challenges/ "src/app/(site)/challenges/"
git commit -m "feat : 챌린지 상세 대시보드(오늘 밴드·읽기 달력·기록 다이얼로그) 구현 #88"
```

---

### Task 9: `ChallengeList` + 목록 라우트

**Files:**
- Create: `src/components/challenges/ChallengeList.tsx`
- Create: `src/app/(site)/challenges/page.tsx`
- Test: `src/components/challenges/ChallengeList.test.tsx`
- Test: `src/app/(site)/challenges/page.test.tsx`

**Interfaces:**
- Consumes: `useChallenges`·`useMyParticipations`·`useMyProgress`(Task 5), `locate`·`formatRange`(Task 1), `STATUS_LABELS`(Task 8에서 `ChallengeDetail.tsx`가 export — import해 재사용), `Pagination`·`EmptyState`·`Skeleton`·`Badge`, `formatDate`
- Produces: `ChallengeList()` — `useSearchParams`로 `page` 읽음(0-base 내부, URL은 1-base `?page=2`). 피처 판별(스펙 §3): 참여 중 ONGOING → 진행 요약 피처 / 미참여 ONGOING → 참여 CTA 피처 / 없으면 생략.

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// src/components/challenges/ChallengeList.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { fetchChallengesMock, fetchPartsMock, fetchProgressMock } = vi.hoisted(() => ({
  fetchChallengesMock: vi.fn(), fetchPartsMock: vi.fn(), fetchProgressMock: vi.fn(),
}));
vi.mock("@/lib/api/challenges", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchChallenges: fetchChallengesMock, fetchMyParticipations: fetchPartsMock, fetchMyProgress: fetchProgressMock,
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(""), usePathname: () => "/challenges" }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import { ChallengeList } from "./ChallengeList";

const card = {
  id: 1, title: "2026 신약 통독", startBook: 40, endBook: 66, startDate: "2026-01-05",
  endDate: "2026-03-10", targetDays: 65, totalChapters: 260, dailyGoal: 4, status: "ONGOING",
};
const page = (content: unknown[]) => ({ content, page: { size: 12, number: 0, totalElements: content.length, totalPages: 1 } });
const participation = {
  challenge: { id: 1, title: "2026 신약 통독", startDate: "2026-01-05", endDate: "2026-03-10", status: "ONGOING", totalChapters: 260 },
  joinedAt: "2026-01-05", progressRate: 34.2, chaptersRead: 89, roundsCompleted: 0, completed: false, streakDays: 23,
};
const progress = {
  progressRate: 34.2, currentPosition: { book: "마태복음", chapter: 4 }, chaptersRead: 4, totalChapters: 260,
  todayChapters: 0, dailyGoal: 4, todayDone: false, streakDays: 23, roundsCompleted: 0, paceDays: 3,
  challenge: participation.challenge,
};

let qc: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
const renderList = () => render(<QueryClientProvider client={qc}><ChallengeList /></QueryClientProvider>);

describe("ChallengeList — 피처 판별 3케이스(스펙 §3)", () => {
  it("참여 중 ONGOING: 오늘 요약 피처 + 기록하러 가기 링크", async () => {
    fetchChallengesMock.mockResolvedValue(page([card]));
    fetchPartsMock.mockResolvedValue(page([participation]));
    fetchProgressMock.mockResolvedValue(progress);
    renderList();
    const cta = await screen.findByRole("link", { name: /오늘 기록하러 가기/ });
    expect(cta.getAttribute("href")).toBe("/challenges/1");
    expect(screen.getByText(/마태복음 5장부터/)).toBeDefined();
  });

  it("미참여 ONGOING: 참여 CTA 피처", async () => {
    fetchChallengesMock.mockResolvedValue(page([card]));
    fetchPartsMock.mockResolvedValue(page([]));
    renderList();
    const cta = await screen.findByRole("link", { name: /참여하러 가기/ });
    expect(cta.getAttribute("href")).toBe("/challenges/1");
    expect(fetchProgressMock).not.toHaveBeenCalled();
  });

  it("ONGOING 없음: 피처 없이 그리드만, 0건이면 EmptyState", async () => {
    fetchChallengesMock.mockResolvedValue(page([]));
    fetchPartsMock.mockResolvedValue(page([]));
    renderList();
    expect(await screen.findByText("등록된 챌린지가 없습니다.")).toBeDefined();
  });

  it("카드에 상태·기간·범위 표기", async () => {
    fetchChallengesMock.mockResolvedValue(page([{ ...card, id: 2, status: "ENDED", title: "지난 통독" }]));
    fetchPartsMock.mockResolvedValue(page([]));
    renderList();
    expect(await screen.findByText("지난 통독")).toBeDefined();
    expect(screen.getByText("종료")).toBeDefined();
    expect(screen.getByText(/마태복음 ~ 요한계시록 · 260장 · 하루 4장/)).toBeDefined();
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm test src/components/challenges/ChallengeList.test.tsx` → FAIL

- [ ] **Step 3: 구현**

```tsx
// src/components/challenges/ChallengeList.tsx
"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { locate, formatRange } from "@/constants/bible";
import { formatDate } from "@/lib/date";
import { useChallenges, useMyParticipations, useMyProgress } from "./queries";
import { STATUS_LABELS } from "./ChallengeDetail";
import type { ChallengeCardResponse } from "@/lib/api/types";

// challenge-feature-card(DESIGN.md): 매일 오는 사람은 클릭 한 번으로 대시보드 도달(스펙 §1).
export function ChallengeList() {
  const sp = useSearchParams();
  const pageParam = Number(sp.get("page") ?? "1");
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam - 1 : 0;

  const list = useChallenges({ page });
  const parts = useMyParticipations(0);

  // 피처 판별(스펙 §3): 목록 응답엔 joined가 없어 참여 이력에서 ONGOING 참여를 찾는다.
  const joinedOngoing = parts.data?.content.find((p) => p.challenge.status === "ONGOING");
  const listOngoing = list.data?.content.find((c) => c.status === "ONGOING");
  const featured = joinedOngoing?.challenge ?? (listOngoing ? { id: listOngoing.id, title: listOngoing.title } : null);
  const progress = useMyProgress(joinedOngoing?.challenge.id ?? 0, joinedOngoing != null);

  if (list.isPending || parts.isPending) {
    return (
      <div className="mt-xl flex flex-col gap-lg" aria-hidden>
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }
  if (list.isError || !list.data) {
    return <p className={cn(typo.bodyMd, "mt-xl text-muted")}>목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>;
  }

  const cards = list.data.content;
  const nextPos = progress.data
    ? locate(
        // 참여 중 피처의 "오늘 읽을 곳" — 목록 카드에서 startBook을 찾는다(같은 목록에 반드시 존재).
        cards.find((c) => c.id === joinedOngoing?.challenge.id)?.startBook ?? 1,
        Math.min(progress.data.chaptersRead + 1, progress.data.totalChapters),
      )
    : null;

  return (
    <div className="mt-xl flex flex-col gap-lg">
      {featured ? (
        <section className="rounded-xl bg-surface-dark p-xl text-center">
          <p className={cn(typo.bodySm, "text-on-dark-soft")}>진행 중인 챌린지</p>
          <p className={cn(typo.titleLg, "mt-xs text-on-dark")}>{featured.title}</p>
          {joinedOngoing && progress.data && nextPos ? (
            <p className={cn(typo.bodyMd, "mt-sm text-on-dark-soft")}>
              오늘은 <b className="text-on-dark">{nextPos.book} {nextPos.chapter}장부터</b> · {Math.round(progress.data.progressRate)}% 진행
            </p>
          ) : null}
          <Link
            href={`/challenges/${featured.id}`}
            className={cn(buttonVariants("primary"), "mt-lg inline-flex h-14 items-center px-xl")}
          >
            {joinedOngoing ? "오늘 기록하러 가기" : "참여하러 가기"}
          </Link>
        </section>
      ) : null}

      {cards.length === 0 ? (
        <EmptyState message="등록된 챌린지가 없습니다." />
      ) : (
        <div className="grid gap-base sm:grid-cols-2">
          {cards.map((c) => <ChallengeCard key={c.id} challenge={c} />)}
        </div>
      )}
      {list.data.page.totalPages > 1 ? <Pagination page={list.data.page} /> : null}
    </div>
  );
}

function ChallengeCard({ challenge: c }: { challenge: ChallengeCardResponse }) {
  return (
    <Link
      href={`/challenges/${c.id}`}
      className="rounded-xl border border-hairline p-xl transition-colors hover:border-primary"
    >
      <div className="flex items-center gap-sm">
        <Badge variant={c.status === "ONGOING" ? "primary" : "default"}>{STATUS_LABELS[c.status]}</Badge>
        <span className={cn(typo.titleMd, "text-ink")}>{c.title}</span>
      </div>
      <p className={cn(typo.datetime, "mt-sm text-muted")}>{formatDate(c.startDate)} ~ {formatDate(c.endDate)}</p>
      <p className={cn(typo.bodySm, "mt-xs text-muted")}>
        {formatRange(c.startBook, c.endBook)} · {c.totalChapters}장 · 하루 {c.dailyGoal}장
      </p>
    </Link>
  );
}
```

- [ ] **Step 4: 통과 확인** — `pnpm test src/components/challenges/ChallengeList.test.tsx` → PASS

- [ ] **Step 5: 목록 라우트 + 테스트** (갤러리 목록 page 동형 — `useSearchParams` 때문에 Suspense 필수)

```tsx
// src/app/(site)/challenges/page.tsx
import { Suspense } from "react";
import { Container } from "@/components/shell/Container";
import { ChallengeGate } from "@/components/challenges/ChallengeGate";
import { ChallengeList } from "@/components/challenges/ChallengeList";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

export const metadata = { title: "성경통독 챌린지" };

export default function ChallengesPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>성경통독 챌린지</h1>
      <Suspense>
        <ChallengeGate>
          <ChallengeList />
        </ChallengeGate>
      </Suspense>
    </Container>
  );
}
```

```tsx
// src/app/(site)/challenges/page.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/challenges/ChallengeGate", () => ({
  ChallengeGate: ({ children }: { children: React.ReactNode }) => <div data-testid="gate">{children}</div>,
}));
vi.mock("@/components/challenges/ChallengeList", () => ({ ChallengeList: () => <div>LIST</div> }));

import ChallengesPage from "./page";

describe("ChallengesPage", () => {
  it("제목 + 게이트 안 목록", () => {
    render(<ChallengesPage />);
    expect(screen.getByRole("heading", { name: "성경통독 챌린지" })).toBeDefined();
    expect(screen.getByTestId("gate")).toBeDefined();
    expect(screen.getByText("LIST")).toBeDefined();
  });
});
```

- [ ] **Step 6: 통과 확인 후 커밋**

Run: `pnpm test "src/app/(site)/challenges/page.test.tsx" src/components/challenges/ChallengeList.test.tsx` → PASS
```bash
git add src/components/challenges/ChallengeList.tsx src/components/challenges/ChallengeList.test.tsx "src/app/(site)/challenges/page.tsx" "src/app/(site)/challenges/page.test.tsx"
git commit -m "feat : 챌린지 목록(진행 중 피처·카드 그리드) 구현 #88"
```

---

### Task 10: 마이페이지 `MyChallengeHistory`

**Files:**
- Create: `src/components/mypage/MyChallengeHistory.tsx`
- Modify: `src/components/mypage/MypageContent.tsx` (섹션 1개 삽입)
- Test: `src/components/mypage/MyChallengeHistory.test.tsx`

**Interfaces:**
- Consumes: `useMyParticipations`(Task 5), `useHasPermission`(`@/lib/auth/useMe`), `Badge`, `formatDate`, `STATUS_LABELS`
- Produces: `MyChallengeHistory()` — `CHALLENGE_PARTICIPATE` 미보유 또는 이력 0건이면 **null 반환(섹션 비노출, ManageHub 관례 — 스펙 §4)**. 행 클릭 → `/challenges/{id}`.

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// src/components/mypage/MyChallengeHistory.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { fetchPartsMock, usePermMock } = vi.hoisted(() => ({ fetchPartsMock: vi.fn(), usePermMock: vi.fn() }));
vi.mock("@/lib/api/challenges", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchMyParticipations: fetchPartsMock,
}));
vi.mock("@/lib/auth/useMe", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useHasPermission: usePermMock,
}));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import { MyChallengeHistory } from "./MyChallengeHistory";

const part = (over: object = {}) => ({
  challenge: { id: 1, title: "2026 신약 통독", startDate: "2026-01-05", endDate: "2026-03-10", status: "ONGOING", totalChapters: 260 },
  joinedAt: "2026-01-05", progressRate: 34.2, chaptersRead: 89, roundsCompleted: 0, completed: false, streakDays: 23,
  ...over,
});
const page = (content: unknown[]) => ({ content, page: { size: 12, number: 0, totalElements: content.length, totalPages: 1 } });

let qc: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  usePermMock.mockReturnValue(true);
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
const renderIt = () => render(<QueryClientProvider client={qc}><MyChallengeHistory /></QueryClientProvider>);

describe("MyChallengeHistory", () => {
  it("참여 이력 행: 제목·상태·진행 요약·상세 링크", async () => {
    fetchPartsMock.mockResolvedValue(page([part()]));
    renderIt();
    expect(await screen.findByText("2026 신약 통독")).toBeDefined();
    expect(screen.getByText("진행 중")).toBeDefined();
    expect(screen.getByText(/34% · 23일 연속/)).toBeDefined();
    expect(screen.getByRole("link", { name: /2026 신약 통독/ }).getAttribute("href")).toBe("/challenges/1");
  });

  it("완독이면 완독 배지", async () => {
    fetchPartsMock.mockResolvedValue(page([part({ completed: true, roundsCompleted: 1 })]));
    renderIt();
    expect(await screen.findByText("완독")).toBeDefined();
  });

  it("이력 0건이면 섹션 비노출(null)", async () => {
    fetchPartsMock.mockResolvedValue(page([]));
    const { container } = renderIt();
    await new Promise((r) => setTimeout(r, 0));
    expect(container.textContent).toBe("");
  });

  it("권한 없으면 조회 자체를 안 함", () => {
    usePermMock.mockReturnValue(false);
    const { container } = renderIt();
    expect(fetchPartsMock).not.toHaveBeenCalled();
    expect(container.textContent).toBe("");
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm test src/components/mypage/MyChallengeHistory.test.tsx` → FAIL

- [ ] **Step 3: 구현**

```tsx
// src/components/mypage/MyChallengeHistory.tsx
"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/date";
import { useHasPermission } from "@/lib/auth/useMe";
import { useMyParticipations } from "@/components/challenges/queries";
import { STATUS_LABELS } from "@/components/challenges/ChallengeDetail";

// 내 통독 이력(스펙 §4). 권한 미보유·0건이면 섹션째 비노출(ManageHub 관례) — 로딩·에러도 조용히 null.
export function MyChallengeHistory() {
  const canView = useHasPermission("CHALLENGE_PARTICIPATE");
  const parts = useMyParticipations(0, canView);

  if (!canView || !parts.data || parts.data.content.length === 0) return null;

  return (
    <section className="rounded-xl border border-hairline bg-surface-card p-xl">
      <h2 className={cn(typo.titleSm, "text-ink")}>내 통독 이력</h2>
      <ul className="mt-md flex flex-col">
        {parts.data.content.map((p) => (
          <li key={p.challenge.id} className="border-t border-hairline first:border-t-0">
            <Link href={`/challenges/${p.challenge.id}`} className="flex flex-col gap-xxs py-md hover:text-primary">
              <span className="flex items-center gap-sm">
                <span className={cn(typo.bodyMd, "font-semibold text-ink")}>{p.challenge.title}</span>
                <Badge variant={p.challenge.status === "ONGOING" ? "primary" : "default"}>
                  {STATUS_LABELS[p.challenge.status]}
                </Badge>
                {p.completed ? <Badge variant="primary">완독</Badge> : null}
              </span>
              <span className={cn(typo.bodySm, "text-muted")}>
                {formatDate(p.challenge.startDate)} ~ {formatDate(p.challenge.endDate)} ·{" "}
                {Math.round(p.progressRate)}% · {p.streakDays}일 연속
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: MypageContent에 섹션 삽입** — `<ManageHub delay={180} />` 바로 위에 (import 추가 + 한 줄):

```tsx
            <Reveal delay={150}><MyChallengeHistory /></Reveal>
            <ManageHub delay={180} />
```

주의: `MyChallengeHistory`가 null을 반환해도 `Reveal` 래퍼가 빈 요소를 남길 수 있다 — Reveal이 wrapper div를 렌더하면 0건일 때 빈 카드가 보이는지 확인하고, 문제가 되면 Reveal을 `MyChallengeHistory` **내부**(null 체크 뒤)로 옮긴다. 판단 기준: 0건 상태에서 마이페이지에 시각 잔여물이 없어야 한다.

- [ ] **Step 5: 통과 확인 후 커밋**

Run: `pnpm test src/components/mypage/` → PASS (기존 MypageContent 테스트 포함)
```bash
git add src/components/mypage/
git commit -m "feat : 마이페이지 내 통독 이력 섹션 추가 #88"
```

---

### Task 11: 어드민 폼 `ChallengeFormDialog`

**Files:**
- Create: `src/components/admin/challenges/schema.ts`
- Create: `src/components/admin/challenges/ChallengeFormDialog.tsx`
- Test: `src/components/admin/challenges/ChallengeFormDialog.test.tsx`

**Interfaces:**
- Consumes: `createChallenge`·`patchChallenge`(Task 3), `fetchChallenge`(Task 2 — edit 시드), `BIBLE_BOOKS`·`chapterCount`·`dailyGoalOf`·`challengeEndDate`(Task 1), `MarkdownEditor`, `adminOnError`, `adminKeys`, Dialog·Input·Button, `formatDate`
- Produces: `ChallengeFormDialog({ open, onOpenChange, mode, editId })` — create/edit 공용. 프리셋 3버튼(전체 1~66/구약 1~39/신약 40~66), 파생 미리보기("총 N장 · 하루 N장 · N 종료"), edit는 fresh 상세로 version 시드(DepartmentFormDialog 선례), 400 detail은 폼 상단 배너.

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// src/components/admin/challenges/ChallengeFormDialog.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { createMock, patchMock, fetchChallengeMock } = vi.hoisted(() => ({
  createMock: vi.fn(), patchMock: vi.fn(), fetchChallengeMock: vi.fn(),
}));
vi.mock("@/lib/api/challenges.admin", () => ({ createChallenge: createMock, patchChallenge: patchMock }));
vi.mock("@/lib/api/challenges", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchChallenge: fetchChallengeMock,
}));
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

import { ChallengeFormDialog } from "./ChallengeFormDialog";
import { ApiError } from "@/lib/auth/apiError";

let qc: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
const renderDialog = (props: Partial<Parameters<typeof ChallengeFormDialog>[0]> = {}) =>
  render(
    <QueryClientProvider client={qc}>
      <ChallengeFormDialog open onOpenChange={vi.fn()} mode="create" {...props} />
    </QueryClientProvider>,
  );

describe("ChallengeFormDialog", () => {
  it("신약 프리셋 클릭 → 범위 40~66 + 미리보기(총 260장)", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "신약" }));
    expect((screen.getByLabelText("시작 권") as HTMLSelectElement).value).toBe("40");
    expect((screen.getByLabelText("끝 권") as HTMLSelectElement).value).toBe("66");
    fireEvent.change(screen.getByLabelText("목표 일수"), { target: { value: "65" } });
    expect(await screen.findByText(/총 260장 · 하루 4장/)).toBeDefined();
  });

  it("생성 제출: createChallenge 호출(빈 소개 생략)", async () => {
    createMock.mockResolvedValue({ id: 1 });
    renderDialog();
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "2026 신약 통독" } });
    fireEvent.click(screen.getByRole("button", { name: "신약" }));
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-01-05" } });
    fireEvent.change(screen.getByLabelText("목표 일수"), { target: { value: "65" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createMock).toHaveBeenCalledWith({
      title: "2026 신약 통독", startBook: 40, endBook: 66, startDate: "2026-01-05", targetDays: 65,
    }));
  });

  it("시작 권 > 끝 권이면 검증 에러", async () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "T" } });
    fireEvent.change(screen.getByLabelText("시작 권"), { target: { value: "40" } });
    fireEvent.change(screen.getByLabelText("끝 권"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-01-05" } });
    fireEvent.change(screen.getByLabelText("목표 일수"), { target: { value: "65" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("끝 권은 시작 권보다 앞설 수 없습니다.")).toBeDefined();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("edit: fresh 상세로 시드 후 PATCH(version 포함)", async () => {
    fetchChallengeMock.mockResolvedValue({
      id: 5, title: "기존", startBook: 1, endBook: 66, startDate: "2026-01-05", endDate: "2027-01-03",
      targetDays: 365, totalChapters: 1189, dailyGoal: 4, status: "ONGOING", joined: false, version: 2, description: "",
    });
    patchMock.mockResolvedValue({ id: 5 });
    renderDialog({ mode: "edit", editId: 5 });
    await waitFor(() => expect((screen.getByLabelText("제목") as HTMLInputElement).value).toBe("기존"));
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "수정됨" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(patchMock.mock.calls[0][0]).toBe(5);
    expect(patchMock.mock.calls[0][1]).toMatchObject({ title: "수정됨", version: 2 });
  });

  it("400 INVALID_INPUT_VALUE detail은 폼 상단 배너로", async () => {
    fetchChallengeMock.mockResolvedValue({
      id: 5, title: "기존", startBook: 1, endBook: 66, startDate: "2026-01-05", endDate: "2027-01-03",
      targetDays: 365, totalChapters: 1189, dailyGoal: 4, status: "ONGOING", joined: false, version: 2, description: "",
    });
    patchMock.mockRejectedValue(new ApiError(400, "INVALID_INPUT_VALUE", "참여자가 있어 범위·기간은 수정할 수 없습니다."));
    renderDialog({ mode: "edit", editId: 5 });
    await waitFor(() => expect((screen.getByLabelText("제목") as HTMLInputElement).value).toBe("기존"));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("참여자가 있어 범위·기간은 수정할 수 없습니다.")).toBeDefined();
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm test src/components/admin/challenges/` → FAIL

- [ ] **Step 3: schema.ts 구현**

```ts
// src/components/admin/challenges/schema.ts
import { z } from "zod";

// 백엔드 ChallengeCreateRequest 제약과 동일(제목 ≤100, 소개 ≤50000, 권 1~66, 일수 1~3650).
// zod v4 — number()에 invalid_type_error 없음: coerce + 메시지 인자만 사용(전역 규칙).
export const challengeSchema = z
  .object({
    title: z.string().trim().min(1, "제목을 입력해 주세요.").max(100, "100자 이내로 입력해 주세요."),
    description: z.string().max(50000, "소개가 너무 깁니다."),
    startBook: z.coerce.number().int().min(1).max(66),
    endBook: z.coerce.number().int().min(1).max(66),
    startDate: z.string().min(1, "시작일을 선택해 주세요."),
    targetDays: z.coerce.number({ error: "목표 일수를 입력해 주세요." }).int("정수로 입력해 주세요.")
      .min(1, "1일 이상이어야 합니다.").max(3650, "3650일 이하여야 합니다."),
  })
  .refine((v) => v.startBook <= v.endBook, {
    path: ["endBook"],
    message: "끝 권은 시작 권보다 앞설 수 없습니다.",
  });
export type ChallengeFormValues = z.infer<typeof challengeSchema>;
```

- [ ] **Step 4: ChallengeFormDialog 구현**

```tsx
// src/components/admin/challenges/ChallengeFormDialog.tsx
"use client";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { adminKeys } from "@/lib/admin/queryKeys";
import { ACTION } from "@/constants/actionButton";
import { ApiError } from "@/lib/auth/apiError";
import { BIBLE_BOOKS, chapterCount, dailyGoalOf, challengeEndDate } from "@/constants/bible";
import { fetchChallenge } from "@/lib/api/challenges";
import { createChallenge, patchChallenge } from "@/lib/api/challenges.admin";
import { challengeSchema, type ChallengeFormValues } from "./schema";

export interface ChallengeFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  editId?: number; // edit 시 필수 — 열 때 fresh 상세로 version·값 시드
}

const EMPTY: ChallengeFormValues = {
  title: "", description: "", startBook: 1, endBook: 66, startDate: "", targetDays: 365,
};

// 전체/구약/신약 — 두 필드로 표현되는 대표 구간(백엔드 설계 §1 근거).
const PRESETS = [
  { label: "전체", startBook: 1, endBook: 66 },
  { label: "구약", startBook: 1, endBook: 39 },
  { label: "신약", startBook: 40, endBook: 66 },
] as const;

export function ChallengeFormDialog({ open, onOpenChange, mode, editId }: ChallengeFormDialogProps) {
  const qc = useQueryClient();
  const isEdit = mode === "edit" && editId != null;
  const [banner, setBanner] = useState<string | undefined>(); // 400 detail(참여자 존재 시 범위·기간 거부 — 스펙 §7)

  const { register, handleSubmit, control, reset, setError, setValue, watch, formState: { errors } } =
    useForm<ChallengeFormValues>({ resolver: zodResolver(challengeSchema), defaultValues: EMPTY });

  // edit: fresh 상세로 version·값 시드(DepartmentFormDialog 선례 — staleTime/gcTime 0, retry false).
  const detail = useQuery({
    queryKey: adminKeys.detail("challenges", editId ?? 0),
    queryFn: () => fetchChallenge(editId as number),
    enabled: open && isEdit,
    staleTime: 0, gcTime: 0, retry: false,
  });
  const version = detail.data?.version ?? 0;
  const canSubmit = mode === "create" || (!!detail.data && !detail.isFetching && !detail.isError);

  useEffect(() => {
    if (!open) return;
    setBanner(undefined);
    if (mode === "create") reset(EMPTY);
    else if (detail.data) {
      const d = detail.data;
      reset({
        title: d.title, description: d.description ?? "",
        startBook: d.startBook, endBook: d.endBook, startDate: d.startDate, targetDays: d.targetDays,
      });
    }
  }, [open, mode, detail.data, reset]);

  useEffect(() => {
    if (detail.isError) adminOnError()(detail.error);
  }, [detail.isError, detail.error]);

  const mutation = useMutation({
    mutationFn: (v: ChallengeFormValues) => {
      const body = {
        title: v.title,
        ...(v.description.trim() === "" ? {} : { description: v.description }),
        startBook: v.startBook, endBook: v.endBook, startDate: v.startDate, targetDays: v.targetDays,
      };
      return isEdit ? patchChallenge(editId as number, { ...body, version }) : createChallenge(body);
    },
    onError: (e: unknown) => {
      // 참여자 존재 시 범위·기간 수정 거부(400) → 폼 상단 배너(스펙 §7). 그 외는 공통 처리.
      if (e instanceof ApiError && e.errorCode === "INVALID_INPUT_VALUE" && e.detail && !e.errors?.length) {
        setBanner(e.detail);
        return;
      }
      adminOnError({
        onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof ChallengeFormValues, { message: fe.reason })),
        onReedit: () => { if (isEdit) void detail.refetch(); },
      })(e);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenges"] });
      if (isEdit) qc.invalidateQueries({ queryKey: ["challenge", editId], exact: true });
      notify.success("저장했습니다.");
      onOpenChange(false);
    },
  });

  // 파생 미리보기(실시간) — 생성 후 진실은 서버 응답(스펙 §4).
  const [wStart, wEnd, wDays, wDate] = watch(["startBook", "endBook", "startDate", "targetDays"]);
  const total = wStart >= 1 && wEnd <= 66 && wStart <= wEnd ? chapterCount(Number(wStart), Number(wEnd)) : null;
  const days = Number(wDays);
  const preview =
    total != null && Number.isInteger(days) && days >= 1
      ? `총 ${total}장 · 하루 ${dailyGoalOf(total, days)}장${wDate ? ` · ${challengeEndDate(wDate, days)} 종료` : ""}`
      : null;

  const bookSelect = (field: { value: number; onChange: (v: number) => void }, id: string) => (
    <select
      id={id}
      className={cn(typo.bodyMd, "h-12 rounded-md border border-hairline bg-canvas px-4 text-ink",
        "focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary outline-hidden")}
      value={String(field.value)}
      onChange={(e) => field.onChange(Number(e.target.value))}
    >
      {BIBLE_BOOKS.map((b, i) => (
        <option key={b.name} value={i + 1}>{b.name}</option>
      ))}
    </select>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "챌린지 수정" : "새 챌린지"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => { if (canSubmit) mutation.mutate(v); })} className="flex flex-col gap-base">
          {banner ? (
            <p role="alert" className={cn(typo.bodySm, "rounded-md bg-surface-soft p-md text-error")}>{banner}</p>
          ) : null}
          <div className="flex flex-col gap-xxs">
            <label htmlFor="ch-title" className={cn(typo.bodySm, "text-body")}>제목</label>
            <Input id="ch-title" error={errors.title?.message} {...register("title")} />
          </div>
          <div className="flex flex-col gap-xxs">
            <span className={cn(typo.bodySm, "text-body")}>범위</span>
            <div className="flex gap-xs">
              {PRESETS.map((p) => (
                <Button key={p.label} type="button" variant="secondary"
                  onClick={() => { setValue("startBook", p.startBook, { shouldValidate: true }); setValue("endBook", p.endBook, { shouldValidate: true }); }}>
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="mt-xs grid grid-cols-2 gap-sm">
              <div className="flex flex-col gap-xxs">
                <label htmlFor="ch-startBook" className={cn(typo.caption, "text-muted")}>시작 권</label>
                <Controller control={control} name="startBook" render={({ field }) => bookSelect(field, "ch-startBook")} />
              </div>
              <div className="flex flex-col gap-xxs">
                <label htmlFor="ch-endBook" className={cn(typo.caption, "text-muted")}>끝 권</label>
                <Controller control={control} name="endBook" render={({ field }) => bookSelect(field, "ch-endBook")} />
              </div>
            </div>
            {errors.endBook?.message ? <p className={cn(typo.caption, "text-error")}>{errors.endBook.message}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="flex flex-col gap-xxs">
              <label htmlFor="ch-startDate" className={cn(typo.bodySm, "text-body")}>시작일</label>
              <Input id="ch-startDate" type="date" error={errors.startDate?.message} {...register("startDate")} />
            </div>
            <div className="flex flex-col gap-xxs">
              <label htmlFor="ch-targetDays" className={cn(typo.bodySm, "text-body")}>목표 일수</label>
              <Input id="ch-targetDays" type="number" inputMode="numeric" min={1} step={1}
                error={errors.targetDays?.message} {...register("targetDays")} />
            </div>
          </div>
          {preview ? <p className={cn(typo.bodySm, "text-primary")}>{preview}</p> : null}
          <div className="flex flex-col gap-xxs">
            <span className={cn(typo.bodySm, "text-body")}>소개(선택)</span>
            <Controller control={control} name="description"
              render={({ field }) => <MarkdownEditor value={field.value} onChange={field.onChange} id="ch-description" rows={5} />} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="tertiary">{ACTION.cancel.label}</Button>
            </DialogClose>
            <Button type="submit" variant="primary" loading={mutation.isPending} disabled={!canSubmit}>{ACTION.save.label}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

주의: 프리셋은 라디오 대신 secondary 버튼 3개(어드민 가독 우선 단순 변형).

- [ ] **Step 5: 통과 확인** — `pnpm test src/components/admin/challenges/` → PASS

- [ ] **Step 6: 커밋 없음** — Task 12에서 어드민 묶음 커밋.

---

### Task 12: `ChallengeManager` + 관리 라우트 + 허브 등록

**Files:**
- Create: `src/components/admin/challenges/ChallengeManager.tsx`
- Create: `src/app/(site)/mypage/manage/challenges/page.tsx`
- Modify: `src/lib/admin/manageDomains.ts` (카드 1건)
- Test: `src/components/admin/challenges/ChallengeManager.test.tsx`

**Interfaces:**
- Consumes: `useChallenges`(Task 5 — `["challenges", …]` 키 공유), `deleteChallenge`(Task 3), `ChallengeFormDialog`(Task 11), `DataTable`·`DeleteConfirmDialog`·`RequirePermission`·`EditAccessDenied`, `formatRange`·`formatDate`, `STATUS_LABELS`, `ApiError`, `ACTION`·`CREATE_ICON`
- Produces: `ChallengeManager()` — DataTable(제목·범위·기간·목표 일수·상태) + 새 챌린지 + 행별 수정/삭제. 목록 403이면 안내 배너(스펙 §7 어드민 엣지).

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// src/components/admin/challenges/ChallengeManager.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { fetchChallengesMock, deleteMock } = vi.hoisted(() => ({
  fetchChallengesMock: vi.fn(), deleteMock: vi.fn(),
}));
vi.mock("@/lib/api/challenges", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchChallenges: fetchChallengesMock,
}));
vi.mock("@/lib/api/challenges.admin", () => ({
  deleteChallenge: deleteMock, createChallenge: vi.fn(), patchChallenge: vi.fn(),
}));
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

import { ChallengeManager } from "./ChallengeManager";
import { ApiError } from "@/lib/auth/apiError";

const card = {
  id: 1, title: "2026 신약 통독", startBook: 40, endBook: 66, startDate: "2026-01-05",
  endDate: "2026-03-10", targetDays: 65, totalChapters: 260, dailyGoal: 4, status: "ONGOING",
};
const page = (content: unknown[]) => ({ content, page: { size: 12, number: 0, totalElements: content.length, totalPages: 1 } });

let qc: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
const renderManager = () => render(<QueryClientProvider client={qc}><ChallengeManager /></QueryClientProvider>);

describe("ChallengeManager", () => {
  it("목록 렌더: 제목·범위·상태", async () => {
    fetchChallengesMock.mockResolvedValue(page([card]));
    renderManager();
    expect(await screen.findByText("2026 신약 통독")).toBeDefined();
    expect(screen.getByText("마태복음 ~ 요한계시록")).toBeDefined();
    expect(screen.getByText("진행 중")).toBeDefined();
  });

  it("403이면 참여 권한 안내 배너(스펙 §7)", async () => {
    fetchChallengesMock.mockRejectedValue(new ApiError(403, "ACCESS_DENIED", undefined));
    renderManager();
    expect(await screen.findByText(/목록 조회에는 통독 챌린지 참여 권한도 필요합니다/)).toBeDefined();
  });

  it("삭제 확인 → deleteChallenge + 목록 무효화", async () => {
    fetchChallengesMock.mockResolvedValue(page([card]));
    deleteMock.mockResolvedValue(undefined);
    renderManager();
    await screen.findByText("2026 신약 통독");
    fireEvent.click(screen.getByRole("button", { name: "2026 신약 통독 삭제" }));
    fireEvent.click(await screen.findByRole("button", { name: "삭제" }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(1));
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm test src/components/admin/challenges/ChallengeManager.test.tsx` → FAIL

- [ ] **Step 3: 구현**

```tsx
// src/components/admin/challenges/ChallengeManager.tsx
"use client";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { ACTION, CREATE_ICON } from "@/constants/actionButton";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { ApiError } from "@/lib/auth/apiError";
import { formatDate } from "@/lib/date";
import { formatRange } from "@/constants/bible";
import { deleteChallenge } from "@/lib/api/challenges.admin";
import { useChallenges } from "@/components/challenges/queries";
import { STATUS_LABELS } from "@/components/challenges/ChallengeDetail";
import type { ChallengeCardResponse } from "@/lib/api/types";
import { ChallengeFormDialog } from "./ChallengeFormDialog";

// 어드민 전용 GET 없음 — 회원 목록(["challenges"] 키) 재사용(태그 관리자의 getTags 선례, 스펙 §3).
export function ChallengeManager() {
  const qc = useQueryClient();
  const list = useChallenges({ page: 0 });

  // CHALLENGE_MANAGE만 있고 CHALLENGE_PARTICIPATE 없는 계정의 403 안내(스펙 §7 어드민 엣지).
  const forbidden = list.isError && list.error instanceof ApiError && list.error.status === 403;
  useEffect(() => {
    if (list.isError && !forbidden) adminOnError()(list.error);
  }, [list.isError, forbidden, list.error]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ChallengeCardResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChallengeCardResponse | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => deleteChallenge(id),
    onError: adminOnError(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenges"] });
      notify.success("삭제했습니다.");
      setDeleteTarget(null);
    },
  });

  if (forbidden) {
    return (
      <p className={cn(typo.bodyMd, "text-muted")}>
        목록 조회에는 통독 챌린지 참여 권한도 필요합니다. 역할 관리에서 CHALLENGE_PARTICIPATE 권한을 확인해 주세요.
      </p>
    );
  }

  const columns: Column<ChallengeCardResponse>[] = [
    { key: "title", header: "제목", cell: (c) => c.title },
    { key: "range", header: "범위", cell: (c) => formatRange(c.startBook, c.endBook) },
    { key: "period", header: "기간", cell: (c) => `${formatDate(c.startDate)} ~ ${formatDate(c.endDate)}` },
    { key: "targetDays", header: "목표 일수", cell: (c) => `${c.targetDays}일` },
    { key: "status", header: "상태", cell: (c) => STATUS_LABELS[c.status] },
  ];

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
          <CREATE_ICON size={18} aria-hidden />
          새 챌린지
        </Button>
      </div>
      <div className="mt-base">
        <DataTable
          columns={columns}
          rows={list.data?.content ?? []}
          rowKey={(c) => c.id}
          loading={list.isPending}
          empty={<p className={cn(typo.bodyMd, "text-muted")}>등록된 챌린지가 없습니다.</p>}
          actions={(c) => (
            <div className="flex justify-end gap-xs">
              <Button type="button" variant="tertiary" aria-label={`${c.title} 수정`} onClick={() => setEditTarget(c)}>
                <ACTION.edit.Icon size={18} aria-hidden />
                <span className="hidden lg:inline">{ACTION.edit.label}</span>
              </Button>
              <Button type="button" variant="tertiary" aria-label={`${c.title} 삭제`} onClick={() => setDeleteTarget(c)}>
                <ACTION.delete.Icon size={18} aria-hidden />
                <span className="hidden lg:inline">{ACTION.delete.label}</span>
              </Button>
            </div>
          )}
        />
      </div>

      <ChallengeFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      <ChallengeFormDialog
        open={editTarget != null}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        mode="edit"
        editId={editTarget?.id}
      />
      <DeleteConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title={deleteTarget ? `'${deleteTarget.title}' 챌린지를 삭제할까요?` : "챌린지를 삭제할까요?"}
        warning="삭제하면 교인들의 참여 기록도 함께 숨겨집니다."
        pending={remove.isPending}
        onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id); }}
      />
    </>
  );
}
```

- [ ] **Step 4: 관리 라우트 + 허브 등록**

```tsx
// src/app/(site)/mypage/manage/challenges/page.tsx
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { ChallengeManager } from "@/components/admin/challenges/ChallengeManager";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 운영 전용 화면(manage-hub → kind:"manage"). 부모 manage/layout이 로그인 가드, 여기서 CHALLENGE_MANAGE 게이트.
export default function ManageChallengesPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>통독 챌린지 관리</h1>
      <div className="mt-xl">
        <RequirePermission permission="CHALLENGE_MANAGE" fallback={<EditAccessDenied />}>
          <ChallengeManager />
        </RequirePermission>
      </div>
    </Container>
  );
}
```

`src/lib/admin/manageDomains.ts` — MANAGE_DOMAINS의 `tags` 항목 아래에:

```ts
  { key: "challenges", label: "통독 챌린지 관리", permission: "CHALLENGE_MANAGE", href: "/mypage/manage/challenges", kind: "manage", category: "content" },
```

- [ ] **Step 5: 통과 확인 후 커밋 (어드민 묶음)**

Run: `pnpm test src/components/admin/challenges/` → PASS, `npx tsc --noEmit` → 에러 0
```bash
git add src/components/admin/challenges/ "src/app/(site)/mypage/manage/challenges/" src/lib/admin/manageDomains.ts
git commit -m "feat : 어드민 통독 챌린지 CRUD(개설·수정·삭제) 구현 #88"
```

---

### Task 13: 최종 검증

**Files:** 없음 (검증 전용 — 수정이 나오면 해당 파일)

- [ ] **Step 1: 전체 테스트** — `pnpm test` → Expected: 전체 PASS (기존 테스트 회귀 없음)
- [ ] **Step 2: 타입체크** — `npx tsc --noEmit` → Expected: 에러 0
- [ ] **Step 3: 린트** — `pnpm lint` → Expected: 에러 0 (경고 포함 여부는 기존 기준 유지)
- [ ] **Step 4: 프로덕션 빌드** — `pnpm build` → Expected: 성공. `/challenges`·`/challenges/[id]`·`/mypage/manage/challenges` 라우트가 출력에 나타난다. `.admin.ts`가 RSC 번들에 새지 않았는지(빌드 에러 없음) 확인.
- [ ] **Step 5: 수정이 있었으면 커밋** — `fix : 최종 검증 수정 #88` (없으면 생략)

## 계획 밖 (하지 않는 것)

메인 배너, 리더보드, 알림, 지난 기록 "수정" UI(취소 후 재기록), 챌린지 복제, 다크 모드 — 스펙 §9 YAGNI 목록 그대로.
