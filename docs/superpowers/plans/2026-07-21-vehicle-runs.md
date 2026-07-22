# 차량운행(탑승 신청) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 차량운행 백엔드 신규 API를 웹에 적용 — 회원 탑승 신청(`/vehicle-runs`) + 어드민 운행일 관리·탑승 명단(`/mypage/manage/vehicle-runs`).

**Architecture:** 회원 영역은 챌린지 패턴 복제(ChallengeGate 동형 게이트 + TanStack Query + authFetch), 어드민은 manage 허브 + DataTable + Dialog 폼 패턴 복제. 공개 노출 없음 — 서버 fetch·ISR 불요.

**Tech Stack:** Next.js(App Router)·TanStack Query·RHF+zod·Tailwind 토큰·vitest.

**스펙:** `docs/superpowers/specs/2026-07-21-vehicle-runs-design.md` (백엔드 계약 단일 진실은 `docs/api-docs.json`)

## Global Constraints

- 코드 작성 전 `node_modules/next/dist/docs/` 관련 문서 확인(AGENTS.md — 이 Next.js는 다르다). RSC `params`/`searchParams`는 **Promise**(기존 `challenges/[id]/page.tsx` 선례).
- 주석은 한국어·WHY 중심. UI 이모지 금지, 아이콘은 lucide-react만.
- hex·px 인라인 금지 — `typo.*`·토큰 유틸만. JSX 조건부는 삼항(`{cond ? <X/> : null}`).
- 테스트 관례: vitest `globals:false` 명시 import · jest-dom 없음(`toBeDefined()`/`getAttribute`) · `next/link`·`next/navigation` mock · mock 컴포넌트는 엘리먼트 반환.
- 검증 3종: `pnpm test` · `npx tsc --noEmit`(lint는 타입체크 안 함) · `pnpm lint`.
- 커밋 형식 `<type> : <설명> #<N>` — **`#<N>`은 실행 시작 시 발급한 이슈 번호로 치환**(브랜치 `20260721_#<N>_차량운행` 생성 후 작업). Co-Authored-By 금지. (사용자 관례: 마이크로 커밋 후 기능별 5~8개로 squash 가능 — 태스크 단위 커밋이면 그 범위에 부합.)
- zod v4: `invalid_type_error` 없음 — 메시지 인자/`{ error }`만.
- 에러 분기는 `errorCode`로만(status·title 금지) — `handleApiError`/`adminOnError` 경유.

---

### Task 1: 회원 API 레이어

**Files:**
- Modify: `src/lib/api/types.ts` (파일 끝에 차량운행 응답 타입 추가)
- Create: `src/lib/api/vehicles.ts`
- Test: `src/lib/api/vehicles.test.ts`

**Interfaces:**
- Produces: `fetchVehicleRuns({page}): Promise<Page<VehicleRunCardResponse>>` · `applyVehicleRequest(runId, body): Promise<VehicleRequestResponse>` · `cancelVehicleRequest(runId): Promise<void>` · `VEHICLE_RUN_PAGE_SIZE = 10` · types.ts의 `VehicleRunCardResponse`·`MyRequestResponse`·`VehicleRequestResponse`·`VehicleRunDetailResponse`·`VehicleRosterEntryResponse`

- [ ] **Step 1: 실패하는 테스트 작성** — `src/lib/api/vehicles.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const authFetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));

import { fetchVehicleRuns, applyVehicleRequest, cancelVehicleRequest, VEHICLE_RUN_PAGE_SIZE } from "./vehicles";

function jsonRes(data: unknown) {
  return new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
}
const emptyPage = { content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } };

beforeEach(() => authFetchMock.mockReset());

describe("vehicles 회원 API", () => {
  it("fetchVehicleRuns: page·size 쿼리(정렬은 백엔드 기본)", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes(emptyPage)));
    await fetchVehicleRuns({ page: 2 });
    expect(authFetchMock).toHaveBeenCalledWith(`/api/vehicle-runs?page=2&size=${VEHICLE_RUN_PAGE_SIZE}`);
  });

  it("applyVehicleRequest: POST JSON body", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes({ id: 1, runId: 5, pickupLocation: "정문" })));
    const r = await applyVehicleRequest(5, { pickupLocation: "정문", note: "2명" });
    expect(authFetchMock).toHaveBeenCalledWith("/api/vehicle-runs/5/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickupLocation: "정문", note: "2명" }),
    });
    expect(r.runId).toBe(5);
  });

  it("cancelVehicleRequest: DELETE, 204면 본문 파싱 없이 성공", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })));
    await expect(cancelVehicleRequest(5)).resolves.toBeUndefined();
    expect(authFetchMock).toHaveBeenCalledWith("/api/vehicle-runs/5/requests/me", { method: "DELETE" });
  });

  it("cancelVehicleRequest: 비-2xx면 ApiError로 reject", async () => {
    authFetchMock.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ errorCode: "RESOURCE_NOT_FOUND", title: "리소스 없음", status: 404 }), {
        status: 404, headers: { "content-type": "application/json" },
      })),
    );
    await expect(cancelVehicleRequest(5)).rejects.toMatchObject({ errorCode: "RESOURCE_NOT_FOUND" });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/lib/api/vehicles.test.ts`
Expected: FAIL — `Cannot find module './vehicles'` 또는 유사 미해결 import 오류

- [ ] **Step 3: 타입 추가** — `src/lib/api/types.ts` **파일 끝**에 추가

```ts
// ── 차량운행(스펙: docs/superpowers/specs/2026-07-21-vehicle-runs-design.md) ──

export interface MyRequestResponse {
  pickupLocation: string;
  note?: string; // @JsonInclude(NON_NULL) 관례 — 미입력 시 누락 가능
}

export interface VehicleRunCardResponse {
  id: number;
  departsAt: string; // offset 없는 LocalDateTime — parseServerDate로 파싱
  note?: string;
  myRequest?: MyRequestResponse | null; // null/누락 = 미신청
}

export interface VehicleRequestResponse {
  id: number;
  runId: number;
  pickupLocation: string;
  note?: string;
}

// 어드민 목록 행 — 단건 GET이 없어 수정 시드·version도 이 행 값에서 얻는다.
export interface VehicleRunDetailResponse {
  id: number;
  departsAt: string;
  note?: string;
  version: number; // 낙관락
}

export interface VehicleRosterEntryResponse {
  name: string; // 탈퇴 회원은 "(탈퇴한 사용자)" — 백엔드 처리
  phone?: string; // 탈퇴 시 누락 가능성 방어
  pickupLocation: string;
  note?: string;
  requestedAt: string;
}
```

- [ ] **Step 4: 구현** — `src/lib/api/vehicles.ts`

```ts
// 차량운행 — 전 엔드포인트 회원전용(VEHICLE_APPLY) → authFetch만 사용(챌린지·갤러리 패턴).
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import { buildListQuery, type Page } from "@/lib/page";
import type { VehicleRunCardResponse, VehicleRequestResponse } from "./types";

export const VEHICLE_RUN_PAGE_SIZE = 10;

// 정렬은 백엔드 기본(departsAt,asc — 출발 임박순)에 맡긴다. 다가오는 운행일만 온다.
export async function fetchVehicleRuns(params: { page?: number }): Promise<Page<VehicleRunCardResponse>> {
  const qs = buildListQuery({ page: params.page, size: VEHICLE_RUN_PAGE_SIZE });
  return parseJson(await authFetch(`/api/vehicle-runs${qs}`));
}

// 요청 타입은 도메인-로컬(types.ts 규약 — 쓰기 요청 타입은 공유 파일에 두지 않는다).
export interface VehicleRequestCreateRequest {
  pickupLocation: string; // ≤200
  note?: string; // 동승 인원·특이사항
}

export async function applyVehicleRequest(
  runId: number,
  body: VehicleRequestCreateRequest,
): Promise<VehicleRequestResponse> {
  return parseJson(
    await authFetch(`/api/vehicle-runs/${runId}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

// 204 No Content — parseJson은 빈 본문에 throw하므로 상태 확인 후 비-2xx만 파싱(ApiError 승격).
export async function cancelVehicleRequest(runId: number): Promise<void> {
  const res = await authFetch(`/api/vehicle-runs/${runId}/requests/me`, { method: "DELETE" });
  if (res.status !== 204) await parseJson(res);
}
```

- [ ] **Step 5: 통과 확인**

Run: `pnpm vitest run src/lib/api/vehicles.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/lib/api/types.ts src/lib/api/vehicles.ts src/lib/api/vehicles.test.ts
git commit -m "feat : 차량운행 회원 API 레이어 추가 #<N>"
```

---

### Task 2: 어드민 API 레이어

**Files:**
- Create: `src/lib/api/vehicles.admin.ts`
- Test: `src/lib/api/vehicles.admin.test.ts`

**Interfaces:**
- Consumes: Task 1의 `VehicleRunDetailResponse`·`VehicleRosterEntryResponse`
- Produces: `fetchAdminVehicleRuns({page})` · `fetchVehicleRoster(runId, {page})` · `createVehicleRun(body)` · `patchVehicleRun(id, body)` · `deleteVehicleRun(id)` · `VEHICLE_ADMIN_PAGE_SIZE = 10` · `VEHICLE_ROSTER_PAGE_SIZE = 20` · `VehicleRunCreateRequest {departsAt, note?}` · `VehicleRunPatchRequest {departsAt?, note?, version}`

- [ ] **Step 1: 실패하는 테스트 작성** — `src/lib/api/vehicles.admin.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const authFetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));

import {
  fetchAdminVehicleRuns, fetchVehicleRoster,
  createVehicleRun, patchVehicleRun, deleteVehicleRun,
  VEHICLE_ADMIN_PAGE_SIZE, VEHICLE_ROSTER_PAGE_SIZE,
} from "./vehicles.admin";

function jsonRes(data: unknown) {
  return new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
}
const emptyPage = { content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } };

beforeEach(() => authFetchMock.mockReset());

describe("vehicles 어드민 API", () => {
  it("fetchAdminVehicleRuns: page·size 쿼리", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes(emptyPage)));
    await fetchAdminVehicleRuns({ page: 1 });
    expect(authFetchMock).toHaveBeenCalledWith(`/api/admin/vehicle-runs?page=1&size=${VEHICLE_ADMIN_PAGE_SIZE}`);
  });

  it("fetchVehicleRoster: 운행일 경로 + page·size(20)", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes(emptyPage)));
    await fetchVehicleRoster(3, { page: 0 });
    expect(authFetchMock).toHaveBeenCalledWith(`/api/admin/vehicle-runs/3/requests?page=0&size=${VEHICLE_ROSTER_PAGE_SIZE}`);
  });

  it("createVehicleRun: POST JSON", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes({ id: 1, departsAt: "2026-07-26T07:30:00", version: 0 })));
    await createVehicleRun({ departsAt: "2026-07-26T07:30:00", note: "본당 앞 출발" });
    expect(authFetchMock).toHaveBeenCalledWith("/api/admin/vehicle-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departsAt: "2026-07-26T07:30:00", note: "본당 앞 출발" }),
    });
  });

  it("patchVehicleRun: PATCH에 version 포함", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes({ id: 1, departsAt: "2026-07-26T08:00:00", version: 1 })));
    await patchVehicleRun(1, { departsAt: "2026-07-26T08:00:00", note: "", version: 0 });
    expect(authFetchMock).toHaveBeenCalledWith("/api/admin/vehicle-runs/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departsAt: "2026-07-26T08:00:00", note: "", version: 0 }),
    });
  });

  it("deleteVehicleRun: DELETE 204 → void", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })));
    await expect(deleteVehicleRun(1)).resolves.toBeUndefined();
    expect(authFetchMock).toHaveBeenCalledWith("/api/admin/vehicle-runs/1", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: undefined,
    });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/lib/api/vehicles.admin.test.ts`
Expected: FAIL — 미해결 import 오류

- [ ] **Step 3: 구현** — `src/lib/api/vehicles.admin.ts`

```ts
// 어드민 차량운행(VEHICLE_MANAGE). client 컴포넌트 전용(authFetch/apiMutate 체인 → RSC 번들 금지).
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import { apiMutate } from "@/lib/admin/apiMutate";
import { buildListQuery, type Page } from "@/lib/page";
import type { VehicleRunDetailResponse, VehicleRosterEntryResponse } from "./types";

export const VEHICLE_ADMIN_PAGE_SIZE = 10;
export const VEHICLE_ROSTER_PAGE_SIZE = 20; // 명단은 훑는 화면 — 넉넉히

// 정렬은 백엔드 기본(departsAt,desc — 지난 운행 포함 최신 출발순)에 맡긴다.
export async function fetchAdminVehicleRuns(params: { page?: number }): Promise<Page<VehicleRunDetailResponse>> {
  const qs = buildListQuery({ page: params.page, size: VEHICLE_ADMIN_PAGE_SIZE });
  return parseJson(await authFetch(`/api/admin/vehicle-runs${qs}`));
}

// 명단(백엔드 기본 createdAt,asc — 신청순). 연락처=개인정보라 조회부터 VEHICLE_MANAGE.
export async function fetchVehicleRoster(
  runId: number,
  params: { page?: number },
): Promise<Page<VehicleRosterEntryResponse>> {
  const qs = buildListQuery({ page: params.page, size: VEHICLE_ROSTER_PAGE_SIZE });
  return parseJson(await authFetch(`/api/admin/vehicle-runs/${runId}/requests${qs}`));
}

// 요청 타입은 도메인-로컬(types.ts 규약 — 어드민 쓰기 타입은 공유 파일 금지).
export interface VehicleRunCreateRequest {
  departsAt: string; // offset 없는 LocalDateTime — toServerDateTime 산출값
  note?: string;
}
export interface VehicleRunPatchRequest {
  departsAt?: string;
  note?: string;
  version: number; // 낙관락 필수
}

export function createVehicleRun(body: VehicleRunCreateRequest): Promise<VehicleRunDetailResponse> {
  return apiMutate<VehicleRunDetailResponse>("/api/admin/vehicle-runs", { method: "POST", body });
}
export function patchVehicleRun(id: number, body: VehicleRunPatchRequest): Promise<VehicleRunDetailResponse> {
  return apiMutate<VehicleRunDetailResponse>(`/api/admin/vehicle-runs/${id}`, { method: "PATCH", body });
}
export function deleteVehicleRun(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/vehicle-runs/${id}`, { method: "DELETE" });
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/lib/api/vehicles.admin.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/api/vehicles.admin.ts src/lib/api/vehicles.admin.test.ts
git commit -m "feat : 차량운행 어드민 API 레이어 추가 #<N>"
```

---

### Task 3: 권한 라벨·DESIGN.md 컴포넌트 등록

문서·상수만 — 테스트 없음(DESIGN.md 규칙: 문서에 없는 컴포넌트를 만들지 않는다 → UI 태스크보다 먼저).

**Files:**
- Modify: `src/constants/permissions.ts` (PERMISSION_LABELS에 2줄)
- Modify: `.claude/rules/DESIGN.md` (콘텐츠 카드 구획 + 어드민 공용 구획)

- [ ] **Step 1: 권한 라벨 추가** — `PERMISSION_LABELS`의 `CHALLENGE_PARTICIPATE` 줄 아래에

```ts
  VEHICLE_MANAGE: "차량운행 관리",
  VEHICLE_APPLY: "차량 탑승 신청",
```

- [ ] **Step 2: DESIGN.md 등록** — "### 콘텐츠 카드" 구획의 `event-card` 항목 아래에 추가:

```markdown
- **`vehicle-run-card`**: 회원 차량 탑승 신청 카드(`/vehicle-runs`) — schedule-card 변형. `{colors.surface-soft}` 배경 +
  출발시각 `{typography.datetime-lg}`(tnum) + 메모 `{typography.body-sm}` `{colors.muted}`. 미신청=우측 "탑승 신청"
  `button-primary`(48px) → 신청 Dialog(픽업 장소 필수·메모 선택), 신청됨="신청됨" `badge` + 내 픽업 장소·메모 요약 +
  "신청 취소" 텍스트 버튼(확인 Dialog). 목록은 다가오는 운행일만(출발 임박순), 게이트는 ChallengeGate 동형(`VEHICLE_APPLY`).
```

"### 어드민 공용 (Admin Shared)" 구획 **맨 끝**(`inquiry-detail-dialog` 아래)에 추가:

```markdown
- **`vehicle-run-manager`**: 차량 운행일 목록·CRUD 화면(`/mypage/manage/vehicle-runs`). `DataTable`(출발시각·메모) + URL 구동 `Pagination`(10건) + 툴바 `새 운행일` + 행 `명단`(하위 페이지 Link)·`수정`·`삭제`(`DeleteConfirmDialog`, "탑승 신청 명단도 함께 사라집니다"). 공개 소비자 없음 — ISR 무효화 불요, `["admin","vehicle-runs",...]`·회원 `["vehicle-runs"]` 클라 쿼리만 무효화.
- **`vehicle-run-form-dialog`**: 운행일 등록·수정 Dialog. `DateTimePicker`(출발시각) + `Textarea`(메모). 단건 GET 없음 — 수정은 행 값 시드(tag-form-modal 패턴) + 낙관락 version(목록 행 값), 충돌 시 목록 재조회 + 닫기.
- **`vehicle-roster-view`**: 운행일별 탑승 명단 페이지(`/mypage/manage/vehicle-runs/[id]`). `DataTable`(이름·연락처 `tel:` 링크·픽업 장소·메모·신청 시각) + `Pagination`(20건). 제목 부제(출발시각)는 표시 전용 `?departsAt=` 쿼리로 전달(단건 GET 없음, 위·변조 무해).
```

- [ ] **Step 3: 커밋**

```bash
git add src/constants/permissions.ts .claude/rules/DESIGN.md
git commit -m "docs : 차량운행 권한 라벨·디자인 컴포넌트 등록 #<N>"
```

---

### Task 4: VehicleGate + 회원 쿼리 훅

**Files:**
- Create: `src/components/vehicles/VehicleGate.tsx`
- Create: `src/components/vehicles/queries.ts`
- Test: `src/components/vehicles/VehicleGate.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `fetchVehicleRuns`·`applyVehicleRequest`·`cancelVehicleRequest`·`VehicleRequestCreateRequest`
- Produces: `VehicleGate({children})` · `useVehicleRuns(page)` · `useApplyVehicleRequest()`(mutate 인자 `{runId, body}`) · `useCancelVehicleRequest()`(mutate 인자 `runId`)

- [ ] **Step 1: 실패하는 테스트 작성** — `src/components/vehicles/VehicleGate.test.tsx` (ChallengeGate.test 동형)

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { useMeMock } = vi.hoisted(() => ({ useMeMock: vi.fn() }));
vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock }));
vi.mock("next/navigation", () => ({ usePathname: () => "/vehicle-runs" }));

import { VehicleGate } from "./VehicleGate";
import { useAuthStore } from "@/lib/auth/authStore";

const Child = () => <div>VEHICLE CONTENT</div>;

beforeEach(() => {
  useMeMock.mockReset();
  useAuthStore.setState({ accessToken: null, refreshToken: null, member: null });
});

describe("VehicleGate", () => {
  it("비로그인이면 로그인 안내 + children 차단", async () => {
    useMeMock.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    render(<VehicleGate><Child /></VehicleGate>);
    expect(await screen.findByText("로그인 후 이용 가능합니다")).toBeDefined();
    expect(screen.queryByText("VEHICLE CONTENT")).toBeNull();
    expect(screen.getByRole("link", { name: "로그인" }).getAttribute("href")).toBe("/login?next=%2Fvehicle-runs");
  });

  it("로그인+로딩이면 스켈레톤", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    render(<VehicleGate><Child /></VehicleGate>);
    await waitFor(() => expect(screen.queryByText("VEHICLE CONTENT")).toBeNull());
    expect(screen.getByTestId("vehicle-skeleton")).toBeDefined();
  });

  it("권한 없으면 교인 승인 안내 + 차단", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: { permissions: [] }, isPending: false, isError: false, refetch: vi.fn() });
    render(<VehicleGate><Child /></VehicleGate>);
    expect(await screen.findByText("교인 승인 후 이용 가능합니다")).toBeDefined();
    expect(screen.queryByText("VEHICLE CONTENT")).toBeNull();
  });

  it("VEHICLE_APPLY 보유면 children 렌더", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: { permissions: ["VEHICLE_APPLY"] }, isPending: false, isError: false, refetch: vi.fn() });
    render(<VehicleGate><Child /></VehicleGate>);
    expect(await screen.findByText("VEHICLE CONTENT")).toBeDefined();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/components/vehicles/VehicleGate.test.tsx`
Expected: FAIL — `Cannot find module './VehicleGate'`

- [ ] **Step 3: 구현** — `src/components/vehicles/VehicleGate.tsx` (ChallengeGate 동형 — 문구·권한만 교체)

```tsx
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

// 차량 탑승 회원전용 게이트(ChallengeGate 동형). 권한 없으면 children 미마운트 → API 호출 0회.
// 분기 순서 중요: useMe는 enabled:!!accessToken이라 !accessToken을 isPending보다 먼저 평가.
export function VehicleGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHasHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: me, isPending, isError, refetch } = useMe();

  if (!hydrated) return <VehicleSkeleton />;
  if (!accessToken) {
    return (
      <VehicleNotice
        title="로그인 후 이용 가능합니다"
        body="차량 탑승 신청은 교인 전용입니다. 로그인해 주세요."
        action={
          <Link href={`/login?next=${encodeURIComponent(sanitizeNext(pathname))}`} className={buttonVariants("primary")}>
            로그인
          </Link>
        }
      />
    );
  }
  if (isPending) return <VehicleSkeleton />;
  if (isError || !me) {
    return (
      <VehicleNotice
        title="정보를 불러오지 못했습니다"
        body="잠시 후 다시 시도해 주세요."
        action={<Button variant="secondary" onClick={() => refetch()}>다시 시도</Button>}
      />
    );
  }
  if (!hasPermission("VEHICLE_APPLY", me)) {
    return (
      <VehicleNotice
        title="교인 승인 후 이용 가능합니다"
        body="차량 탑승 신청은 교인 승인(MEMBER) 후 가능합니다. 교회로 문의해 주세요."
      />
    );
  }
  return <>{children}</>;
}

function VehicleSkeleton() {
  return (
    <div data-testid="vehicle-skeleton" className="mt-xl flex flex-col gap-lg" aria-hidden>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

function VehicleNotice({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div role="status" className="mt-xl flex flex-col items-center gap-sm py-xxl text-center">
      <p className={cn(typo.titleMd, "text-ink")}>{title}</p>
      <p className={cn(typo.bodyMd, "text-muted")}>{body}</p>
      {action ? <div className="mt-sm">{action}</div> : null}
    </div>
  );
}
```

- [ ] **Step 4: 쿼리 훅 구현** — `src/components/vehicles/queries.ts`

```ts
"use client";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { notify } from "@/lib/notify";
import { ApiError } from "@/lib/auth/apiError";
import { handleApiError } from "@/lib/auth/handleApiError";
import {
  fetchVehicleRuns, applyVehicleRequest, cancelVehicleRequest,
  type VehicleRequestCreateRequest,
} from "@/lib/api/vehicles";

// 게이트 통과 후에만 마운트. retry:false — 401 재시도는 authFetch 전담(챌린지 컨벤션).
export function useVehicleRuns(page: number) {
  return useQuery({
    queryKey: ["vehicle-runs", { page }],
    queryFn: () => fetchVehicleRuns({ page }),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

// 신청·취소 공통 onError: 상태 어긋남(중복 신청·소멸된 운행일)은 안내 후 목록 재조회로
// 실상태 동기화(다른 기기에서 신청/취소한 경우 — 스펙 §5). 그 외는 공통 errorCode 분기.
function vehicleMutationError(qc: ReturnType<typeof useQueryClient>) {
  return (e: unknown) => {
    if (e instanceof ApiError) {
      if (e.errorCode === "DUPLICATE_RESOURCE" || e.errorCode === "RESOURCE_NOT_FOUND") {
        notify.error(e.errorCode === "DUPLICATE_RESOURCE" ? "이미 신청한 운행일입니다." : "운행일을 찾을 수 없습니다.");
        void qc.invalidateQueries({ queryKey: ["vehicle-runs"] });
        return;
      }
      handleApiError(e); // INVALID_INPUT_VALUE(출발 시각 경과 등)=detail 토스트 외 공통 분기
      return;
    }
    notify.error("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  };
}

export function useApplyVehicleRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, body }: { runId: number; body: VehicleRequestCreateRequest }) =>
      applyVehicleRequest(runId, body),
    onError: vehicleMutationError(qc),
    onSuccess: () => {
      notify.success("탑승을 신청했습니다.");
      void qc.invalidateQueries({ queryKey: ["vehicle-runs"] });
    },
  });
}

export function useCancelVehicleRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: number) => cancelVehicleRequest(runId),
    onError: vehicleMutationError(qc),
    onSuccess: () => {
      notify.success("신청을 취소했습니다.");
      void qc.invalidateQueries({ queryKey: ["vehicle-runs"] });
    },
  });
}
```

- [ ] **Step 5: 통과 확인**

Run: `pnpm vitest run src/components/vehicles/VehicleGate.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/components/vehicles/VehicleGate.tsx src/components/vehicles/VehicleGate.test.tsx src/components/vehicles/queries.ts
git commit -m "feat : 차량 탑승 게이트·회원 쿼리 훅 추가 #<N>"
```

---

### Task 5: VehicleApplyDialog (탑승 신청 폼)

**Files:**
- Create: `src/components/vehicles/VehicleApplyDialog.tsx`
- Test: `src/components/vehicles/VehicleApplyDialog.test.tsx`

**Interfaces:**
- Consumes: Task 4 `useApplyVehicleRequest`, Task 1 `VehicleRunCardResponse`
- Produces: `VehicleApplyDialog({ run: VehicleRunCardResponse | null; onOpenChange: (v: boolean) => void })` — `run != null`이면 열림

- [ ] **Step 1: 실패하는 테스트 작성** — `src/components/vehicles/VehicleApplyDialog.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { applyMock } = vi.hoisted(() => ({ applyMock: vi.fn() }));
vi.mock("@/lib/api/vehicles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/vehicles")>()),
  applyVehicleRequest: applyMock,
}));

import { VehicleApplyDialog } from "./VehicleApplyDialog";
import type { VehicleRunCardResponse } from "@/lib/api/types";

const run: VehicleRunCardResponse = { id: 5, departsAt: "2026-07-26T07:30:00", note: "본당 앞", myRequest: null };

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => vi.clearAllMocks());

const renderDialog = (onOpenChange = vi.fn()) =>
  render(
    <QueryClientProvider client={qc}>
      <VehicleApplyDialog run={run} onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );

describe("VehicleApplyDialog", () => {
  it("픽업 장소 미입력 제출이면 검증 메시지 + API 미호출", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "신청" }));
    expect(await screen.findByText("픽업 장소를 입력해 주세요.")).toBeDefined();
    expect(applyMock).not.toHaveBeenCalled();
  });

  it("제출 성공 시 payload 전달(빈 메모는 생략) + 닫힘", async () => {
    applyMock.mockResolvedValue({ id: 1, runId: 5, pickupLocation: "정문" });
    const onOpenChange = vi.fn();
    renderDialog(onOpenChange);
    fireEvent.change(screen.getByLabelText("픽업 장소 (필수)"), { target: { value: "○○아파트 정문" } });
    fireEvent.click(screen.getByRole("button", { name: "신청" }));
    await waitFor(() => expect(applyMock).toHaveBeenCalledWith(5, { pickupLocation: "○○아파트 정문" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("메모 입력 시 note 포함", async () => {
    applyMock.mockResolvedValue({ id: 1, runId: 5, pickupLocation: "정문" });
    renderDialog();
    fireEvent.change(screen.getByLabelText("픽업 장소 (필수)"), { target: { value: "정문" } });
    fireEvent.change(screen.getByLabelText("메모 (선택)"), { target: { value: "동생과 2명" } });
    fireEvent.click(screen.getByRole("button", { name: "신청" }));
    await waitFor(() => expect(applyMock).toHaveBeenCalledWith(5, { pickupLocation: "정문", note: "동생과 2명" }));
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/components/vehicles/VehicleApplyDialog.test.tsx`
Expected: FAIL — `Cannot find module './VehicleApplyDialog'`

- [ ] **Step 3: 구현** — `src/components/vehicles/VehicleApplyDialog.tsx`

```tsx
"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { ACTION } from "@/constants/actionButton";
import { formatDate, formatClockTime } from "@/lib/date";
import { useApplyVehicleRequest } from "./queries";
import type { VehicleRunCardResponse } from "@/lib/api/types";

// 백엔드 VehicleRequestCreateRequest 제약과 동일(pickupLocation 필수·≤200).
const applySchema = z.object({
  pickupLocation: z.string().trim().min(1, "픽업 장소를 입력해 주세요.").max(200, "200자 이내로 입력해 주세요."),
  note: z.string(),
});
type ApplyFormValues = z.infer<typeof applySchema>;
const EMPTY: ApplyFormValues = { pickupLocation: "", note: "" };

export interface VehicleApplyDialogProps {
  run: VehicleRunCardResponse | null; // null=닫힘
  onOpenChange: (v: boolean) => void;
}

export function VehicleApplyDialog({ run, onOpenChange }: VehicleApplyDialogProps) {
  const apply = useApplyVehicleRequest();
  const open = run != null;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ApplyFormValues>({
    resolver: zodResolver(applySchema),
    defaultValues: EMPTY,
  });

  // 열릴 때마다 초기화 — 직전 신청 입력 잔존 방지.
  useEffect(() => {
    if (open) reset(EMPTY);
  }, [open, reset]);

  const submit = (v: ApplyFormValues) => {
    if (run == null) return;
    apply.mutate(
      { runId: run.id, body: { pickupLocation: v.pickupLocation, ...(v.note.trim() === "" ? {} : { note: v.note }) } },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {run ? `${formatDate(run.departsAt)} ${formatClockTime(run.departsAt)} 탑승 신청` : "탑승 신청"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-base">
          <div className="flex flex-col gap-xxs">
            <label htmlFor="vh-pickup" className={cn(typo.bodySm, "text-body")}>픽업 장소 (필수)</label>
            <Input id="vh-pickup" placeholder="예: ○○아파트 정문" error={errors.pickupLocation?.message} {...register("pickupLocation")} />
          </div>
          <div className="flex flex-col gap-xxs">
            <label htmlFor="vh-note" className={cn(typo.bodySm, "text-body")}>메모 (선택)</label>
            <Textarea id="vh-note" rows={3} placeholder="동승 인원·특이사항이 있으면 적어 주세요." {...register("note")} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="tertiary">{ACTION.cancel.label}</Button>
            </DialogClose>
            <Button type="submit" variant="primary" loading={apply.isPending}>신청</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/components/vehicles/VehicleApplyDialog.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/components/vehicles/VehicleApplyDialog.tsx src/components/vehicles/VehicleApplyDialog.test.tsx
git commit -m "feat : 탑승 신청 다이얼로그 추가 #<N>"
```

---

### Task 6: VehicleRunList + 회원 페이지 조립

**Files:**
- Create: `src/components/vehicles/VehicleRunList.tsx`
- Create: `src/app/(site)/vehicle-runs/page.tsx`
- Test: `src/components/vehicles/VehicleRunList.test.tsx`, `src/app/(site)/vehicle-runs/page.test.tsx`

**Interfaces:**
- Consumes: Task 4 `useVehicleRuns`·`useCancelVehicleRequest`, Task 5 `VehicleApplyDialog`, Task 1 `VehicleRunCardResponse`
- Produces: `VehicleRunList()` · 라우트 `/vehicle-runs`

- [ ] **Step 1: 실패하는 테스트 작성** — `src/components/vehicles/VehicleRunList.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { fetchMock, cancelMock } = vi.hoisted(() => ({ fetchMock: vi.fn(), cancelMock: vi.fn() }));
vi.mock("@/lib/api/vehicles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/vehicles")>()),
  fetchVehicleRuns: fetchMock,
  cancelVehicleRequest: cancelMock,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/vehicle-runs",
}));
vi.mock("./VehicleApplyDialog", () => ({
  VehicleApplyDialog: ({ run }: { run: { id: number } | null }) => <div>apply-dialog:{run?.id ?? "none"}</div>,
}));

import { VehicleRunList } from "./VehicleRunList";
import type { VehicleRunCardResponse } from "@/lib/api/types";

const page = (content: VehicleRunCardResponse[], totalPages = 1) => ({
  content,
  page: { size: 10, number: 0, totalElements: content.length, totalPages },
});
const unapplied: VehicleRunCardResponse = { id: 5, departsAt: "2026-07-26T07:30:00", note: "본당 앞 출발", myRequest: null };
const applied: VehicleRunCardResponse = {
  id: 6, departsAt: "2026-08-02T07:30:00", myRequest: { pickupLocation: "정문", note: "2명" },
};

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => vi.clearAllMocks());
const renderList = () =>
  render(
    <QueryClientProvider client={qc}>
      <VehicleRunList />
    </QueryClientProvider>,
  );

describe("VehicleRunList", () => {
  it("빈 목록이면 안내 문구", async () => {
    fetchMock.mockResolvedValue(page([]));
    renderList();
    expect(await screen.findByText("예정된 운행일이 없습니다.")).toBeDefined();
  });

  it("미신청 카드엔 '탑승 신청' 버튼 → 클릭 시 다이얼로그 타깃 설정", async () => {
    fetchMock.mockResolvedValue(page([unapplied]));
    renderList();
    const btn = await screen.findByRole("button", { name: "탑승 신청" });
    expect(screen.getByText("본당 앞 출발")).toBeDefined();
    fireEvent.click(btn);
    expect(screen.getByText("apply-dialog:5")).toBeDefined();
  });

  it("신청됨 카드엔 배지·내 픽업 장소·취소 버튼", async () => {
    fetchMock.mockResolvedValue(page([applied]));
    renderList();
    expect(await screen.findByText("신청됨")).toBeDefined();
    expect(screen.getByText("픽업: 정문")).toBeDefined();
    expect(screen.getByRole("button", { name: "신청 취소" })).toBeDefined();
  });

  it("취소 확인 후 cancel API 호출", async () => {
    fetchMock.mockResolvedValue(page([applied]));
    cancelMock.mockResolvedValue(undefined);
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: "신청 취소" }));
    // 확인 다이얼로그의 확정 버튼(같은 라벨) — 다이얼로그가 열리면 두 개가 된다.
    const confirmBtns = await screen.findAllByRole("button", { name: "신청 취소" });
    fireEvent.click(confirmBtns[confirmBtns.length - 1]);
    await waitFor(() => expect(cancelMock).toHaveBeenCalledWith(6));
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/components/vehicles/VehicleRunList.test.tsx`
Expected: FAIL — `Cannot find module './VehicleRunList'`

- [ ] **Step 3: 구현** — `src/components/vehicles/VehicleRunList.tsx`

```tsx
"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { formatDate, formatClockTime } from "@/lib/date";
import { useVehicleRuns, useCancelVehicleRequest } from "./queries";
import { VehicleApplyDialog } from "./VehicleApplyDialog";
import type { VehicleRunCardResponse } from "@/lib/api/types";

// vehicle-run-card(DESIGN.md): schedule-card 변형 — surface-soft 카드에 출발시각·메모·신청 상태/액션.
export function VehicleRunList() {
  const sp = useSearchParams();
  const pageParam = Number(sp.get("page") ?? "0");
  const page = Number.isInteger(pageParam) && pageParam >= 0 ? pageParam : 0;

  const list = useVehicleRuns(page);
  const cancel = useCancelVehicleRequest();
  const [applyTarget, setApplyTarget] = useState<VehicleRunCardResponse | null>(null);
  const [cancelTarget, setCancelTarget] = useState<VehicleRunCardResponse | null>(null);

  if (list.isPending) {
    return (
      <div className="mt-xl flex flex-col gap-lg" aria-hidden>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }
  if (list.isError || !list.data) {
    return <p className={cn(typo.bodyMd, "mt-xl text-muted")}>목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>;
  }

  const runs = list.data.content;
  const departLabel = (run: VehicleRunCardResponse) => `${formatDate(run.departsAt)} ${formatClockTime(run.departsAt)}`;

  return (
    <div className="mt-xl flex flex-col gap-lg">
      {runs.length === 0 ? <EmptyState message="예정된 운행일이 없습니다." /> : null}
      {runs.map((run) => (
        <section key={run.id} className="rounded-xl bg-surface-soft p-xl">
          <div className="flex flex-wrap items-center justify-between gap-base">
            <div className="flex flex-col gap-xxs">
              <p className={cn(typo.datetimeLg, "text-ink")}>{departLabel(run)} 출발</p>
              {run.note ? <p className={cn(typo.bodySm, "text-muted")}>{run.note}</p> : null}
            </div>
            {run.myRequest ? (
              <div className="flex flex-col items-end gap-xs">
                <Badge variant="primary">신청됨</Badge>
                <p className={cn(typo.bodySm, "text-body")}>픽업: {run.myRequest.pickupLocation}</p>
                {run.myRequest.note ? <p className={cn(typo.caption, "text-muted")}>{run.myRequest.note}</p> : null}
                <Button type="button" variant="tertiary" onClick={() => setCancelTarget(run)}>신청 취소</Button>
              </div>
            ) : (
              <Button type="button" variant="primary" onClick={() => setApplyTarget(run)}>탑승 신청</Button>
            )}
          </div>
        </section>
      ))}

      {list.data.page.totalPages > 1 ? <Pagination page={list.data.page} /> : null}

      <VehicleApplyDialog run={applyTarget} onOpenChange={(v) => { if (!v) setApplyTarget(null); }} />
      <DeleteConfirmDialog
        open={cancelTarget != null}
        onOpenChange={(v) => { if (!v) setCancelTarget(null); }}
        title="탑승 신청을 취소할까요?"
        warning={cancelTarget ? `${departLabel(cancelTarget)} 출발 운행입니다.` : undefined}
        confirmLabel="신청 취소"
        pending={cancel.isPending}
        onConfirm={() => {
          if (cancelTarget) cancel.mutate(cancelTarget.id, { onSuccess: () => setCancelTarget(null) });
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: 페이지 작성** — `src/app/(site)/vehicle-runs/page.tsx` (challenges/page.tsx 동형)

```tsx
import { Suspense } from "react";
import { Container } from "@/components/shell/Container";
import { VehicleGate } from "@/components/vehicles/VehicleGate";
import { VehicleRunList } from "@/components/vehicles/VehicleRunList";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

export const metadata = { title: "차량 탑승 신청" };

// 회원 전용 — 서버 프리렌더 없음, 게이트 통과 후 클라이언트가 전부 조회(챌린지 패턴).
export default function VehicleRunsPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>차량 탑승 신청</h1>
      <Suspense>
        <VehicleGate>
          <VehicleRunList />
        </VehicleGate>
      </Suspense>
    </Container>
  );
}
```

- [ ] **Step 5: 페이지 테스트** — `src/app/(site)/vehicle-runs/page.test.tsx` (challenges 페이지 테스트 동형)

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/vehicles/VehicleGate", () => ({
  VehicleGate: ({ children }: { children: React.ReactNode }) => <div data-testid="gate">{children}</div>,
}));
vi.mock("@/components/vehicles/VehicleRunList", () => ({
  VehicleRunList: () => <div>run-list</div>,
}));

import VehicleRunsPage, { metadata } from "./page";

describe("/vehicle-runs 페이지", () => {
  it("제목·게이트·목록을 렌더한다", () => {
    render(<VehicleRunsPage />);
    expect(screen.getByRole("heading", { name: "차량 탑승 신청" })).toBeDefined();
    expect(screen.getByTestId("gate")).toBeDefined();
    expect(screen.getByText("run-list")).toBeDefined();
  });

  it("metadata title 설정", () => {
    expect(metadata.title).toBe("차량 탑승 신청");
  });
});
```

- [ ] **Step 6: 통과 확인**

Run: `pnpm vitest run src/components/vehicles/VehicleRunList.test.tsx "src/app/(site)/vehicle-runs/page.test.tsx"`
Expected: PASS (6 tests)

- [ ] **Step 7: 커밋**

```bash
git add src/components/vehicles/VehicleRunList.tsx src/components/vehicles/VehicleRunList.test.tsx "src/app/(site)/vehicle-runs/page.tsx" "src/app/(site)/vehicle-runs/page.test.tsx"
git commit -m "feat : 차량 탑승 신청 회원 페이지 추가 #<N>"
```

---

### Task 7: 네비 노출 (예배·설교 그룹)

**Files:**
- Modify: `src/constants/navigation.ts` (`NavIconKey`·`WORSHIP_LINKS`)
- Modify: `src/components/shell/MegaMenu.tsx` (lucide `Bus` import + `ICONS` 매핑)
- Test: `src/constants/navigation.test.ts` (기존 예배·설교 기대값 갱신)

**Interfaces:**
- Consumes: Task 6 라우트 `/vehicle-runs`
- Produces: 네비 링크 `{ label: "차량 신청", href: "/vehicle-runs", icon: "bus" }` (푸터는 FOOTER_COLUMNS가 같은 배열 공유 — 자동 반영)

- [ ] **Step 1: 실패하는 테스트로 갱신** — `src/constants/navigation.test.ts`의 예배·설교 기대값 수정

기존:
```ts
    expect(worship?.children?.map((c) => c.href)).toEqual(["/worship", "/sermons", "/challenges"]);
```
변경:
```ts
    expect(worship?.children?.map((c) => c.href)).toEqual(["/worship", "/sermons", "/challenges", "/vehicle-runs"]);
```
(해당 it 블록의 설명 문구도 "예배시간·설교·성경통독·차량 신청"으로 갱신)

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/constants/navigation.test.ts`
Expected: FAIL — 예배·설교 children 기대값 불일치

- [ ] **Step 3: 구현** — `src/constants/navigation.ts`

`NavIconKey` 유니언에 `| "bus"` 추가(마지막 `| "heart"` 뒤). `WORSHIP_LINKS`에:

```ts
const WORSHIP_LINKS: NavLink[] = [
  { label: "예배시간", href: "/worship", icon: "calendarClock" },
  { label: "설교", href: "/sermons", icon: "bookOpen" },
  { label: "성경통독", href: "/challenges", icon: "bookOpenCheck" },
  { label: "차량 신청", href: "/vehicle-runs", icon: "bus" },
];
```

`src/components/shell/MegaMenu.tsx`: lucide import에 `Bus` 추가, `ICONS` 매핑에 `bus: Bus,` 추가.

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/constants/navigation.test.ts && npx tsc --noEmit`
Expected: PASS + 타입 오류 0 (`NavIconKey` 추가 누락 시 MegaMenu `Record<NavIconKey, ...>`가 타입 에러로 잡아준다)

- [ ] **Step 5: 커밋**

```bash
git add src/constants/navigation.ts src/constants/navigation.test.ts src/components/shell/MegaMenu.tsx
git commit -m "feat : 네비 예배·설교 그룹에 차량 신청 노출 #<N>"
```

---

### Task 8: VehicleRunFormDialog (운행일 등록·수정)

**Files:**
- Create: `src/components/admin/vehicles/VehicleRunFormDialog.tsx`
- Test: `src/components/admin/vehicles/VehicleRunFormDialog.test.tsx`

**Interfaces:**
- Consumes: Task 2 `createVehicleRun`·`patchVehicleRun`, Task 1 `VehicleRunDetailResponse`
- Produces: `VehicleRunFormDialog({ open, onOpenChange, editTarget: VehicleRunDetailResponse | null })` — `editTarget null`=생성 모드

- [ ] **Step 1: 실패하는 테스트 작성** — `src/components/admin/vehicles/VehicleRunFormDialog.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { createMock, patchMock } = vi.hoisted(() => ({ createMock: vi.fn(), patchMock: vi.fn() }));
vi.mock("@/lib/api/vehicles.admin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/vehicles.admin")>()),
  createVehicleRun: createMock,
  patchVehicleRun: patchMock,
}));

import { VehicleRunFormDialog } from "./VehicleRunFormDialog";
import type { VehicleRunDetailResponse } from "@/lib/api/types";

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => vi.clearAllMocks());

const renderDialog = (editTarget: VehicleRunDetailResponse | null = null, onOpenChange = vi.fn()) =>
  render(
    <QueryClientProvider client={qc}>
      <VehicleRunFormDialog open onOpenChange={onOpenChange} editTarget={editTarget} />
    </QueryClientProvider>,
  );

describe("VehicleRunFormDialog", () => {
  it("출발 시각 미선택 제출이면 검증 메시지 + API 미호출", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("출발 시각을 선택해 주세요.")).toBeDefined();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("생성: toServerDateTime 직렬화 + 빈 메모 생략", async () => {
    createMock.mockResolvedValue({ id: 1, departsAt: "2026-07-26T07:30:00", version: 0 });
    renderDialog();
    fireEvent.change(screen.getByLabelText("출발 시각"), { target: { value: "2026-07-26T07:30" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createMock).toHaveBeenCalledWith({ departsAt: "2026-07-26T07:30:00" }));
  });

  it("수정: 행 값 시드 + version 포함 PATCH", async () => {
    patchMock.mockResolvedValue({ id: 3, departsAt: "2026-07-26T08:00:00", version: 3 });
    renderDialog({ id: 3, departsAt: "2026-07-26T07:30:00", note: "본당 앞", version: 2 });
    // 행 값 시드 확인
    const dt = screen.getByLabelText("출발 시각") as HTMLInputElement;
    await waitFor(() => expect(dt.value).toBe("2026-07-26T07:30"));
    fireEvent.change(dt, { target: { value: "2026-07-26T08:00" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(patchMock).toHaveBeenCalledWith(3, { departsAt: "2026-07-26T08:00:00", note: "본당 앞", version: 2 }),
    );
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/components/admin/vehicles/VehicleRunFormDialog.test.tsx`
Expected: FAIL — `Cannot find module './VehicleRunFormDialog'`

- [ ] **Step 3: 구현** — `src/components/admin/vehicles/VehicleRunFormDialog.tsx`

```tsx
"use client";
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { DateTimePicker } from "@/components/admin/DateTimePicker";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { adminKeys } from "@/lib/admin/queryKeys";
import { notify } from "@/lib/notify";
import { ACTION } from "@/constants/actionButton";
import { toLocalInput, toServerDateTime } from "@/lib/date";
import { createVehicleRun, patchVehicleRun } from "@/lib/api/vehicles.admin";
import type { VehicleRunDetailResponse } from "@/lib/api/types";

const runSchema = z.object({
  departsAt: z.string().min(1, "출발 시각을 선택해 주세요."),
  note: z.string(),
});
type RunFormValues = z.infer<typeof runSchema>;
const EMPTY: RunFormValues = { departsAt: "", note: "" };

export interface VehicleRunFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editTarget: VehicleRunDetailResponse | null; // null=생성. 단건 GET 없음 — 행 값 시드(tag-form-modal 패턴)
}

export function VehicleRunFormDialog({ open, onOpenChange, editTarget }: VehicleRunFormDialogProps) {
  const qc = useQueryClient();
  const isEdit = editTarget != null;

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<RunFormValues>({
    resolver: zodResolver(runSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    if (editTarget) reset({ departsAt: toLocalInput(editTarget.departsAt), note: editTarget.note ?? "" });
    else reset(EMPTY);
  }, [open, editTarget, reset]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: adminKeys.listAll("vehicle-runs") });
    void qc.invalidateQueries({ queryKey: ["vehicle-runs"] }); // 운영자 겸 교인 세션의 회원 목록 동기화
  };

  const mutation = useMutation({
    mutationFn: (v: RunFormValues) => {
      if (isEdit) {
        // PATCH는 두 필드 모두 전송 — note 비움=삭제 의도(빈 문자열로 비운다).
        return patchVehicleRun(editTarget.id, {
          departsAt: toServerDateTime(v.departsAt),
          note: v.note,
          version: editTarget.version,
        });
      }
      const note = v.note.trim() === "" ? undefined : v.note;
      return createVehicleRun({ departsAt: toServerDateTime(v.departsAt), ...(note === undefined ? {} : { note }) });
    },
    onError: adminOnError({
      // 단건 GET 없음 — 최신 version 재시드는 목록 재조회로 하고 대화상자는 닫아 재진입을 유도.
      onReedit: () => {
        invalidate();
        onOpenChange(false);
      },
    }),
    onSuccess: () => {
      invalidate();
      notify.success("저장했습니다.");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "운행일 수정" : "새 운행일"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-base">
          <div className="flex flex-col gap-xxs">
            <label htmlFor="vr-departsAt" className={cn(typo.bodySm, "text-body")}>출발 시각</label>
            <Controller
              control={control}
              name="departsAt"
              render={({ field }) => (
                <DateTimePicker id="vr-departsAt" value={field.value} onChange={field.onChange} error={errors.departsAt?.message} />
              )}
            />
          </div>
          <div className="flex flex-col gap-xxs">
            <label htmlFor="vr-note" className={cn(typo.bodySm, "text-body")}>메모 (선택)</label>
            <Textarea id="vr-note" rows={3} placeholder="노선·경유지 등 교인에게 보여줄 안내" {...register("note")} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="tertiary">{ACTION.cancel.label}</Button>
            </DialogClose>
            <Button type="submit" variant="primary" loading={mutation.isPending}>{ACTION.save.label}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/components/admin/vehicles/VehicleRunFormDialog.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/components/admin/vehicles/VehicleRunFormDialog.tsx src/components/admin/vehicles/VehicleRunFormDialog.test.tsx
git commit -m "feat : 운행일 등록·수정 다이얼로그 추가 #<N>"
```

---

### Task 9: VehicleRunManager + 관리 페이지 + 허브 카드

**Files:**
- Create: `src/components/admin/vehicles/VehicleRunManager.tsx`
- Create: `src/app/(site)/mypage/manage/vehicle-runs/page.tsx`
- Modify: `src/lib/admin/manageDomains.ts` (카드 추가 + inbox 라벨 "문의"→"접수")
- Test: `src/components/admin/vehicles/VehicleRunManager.test.tsx`

**Interfaces:**
- Consumes: Task 2 `fetchAdminVehicleRuns`·`deleteVehicleRun`·`VEHICLE_ADMIN_PAGE_SIZE`, Task 8 `VehicleRunFormDialog`
- Produces: `VehicleRunManager()` · 라우트 `/mypage/manage/vehicle-runs` · 관리 허브 카드(key `vehicle-runs`)

- [ ] **Step 1: 실패하는 테스트 작성** — `src/components/admin/vehicles/VehicleRunManager.test.tsx` (InquiryManager.test 동형)

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { listMock, deleteMock, searchParamsRef } = vi.hoisted(() => ({
  listMock: vi.fn(),
  deleteMock: vi.fn(),
  searchParamsRef: { current: new URLSearchParams("") },
}));
vi.mock("@/lib/api/vehicles.admin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/vehicles.admin")>()),
  fetchAdminVehicleRuns: listMock,
  deleteVehicleRun: deleteMock,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/mypage/manage/vehicle-runs",
  useSearchParams: () => searchParamsRef.current,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock("./VehicleRunFormDialog", () => ({
  VehicleRunFormDialog: ({ open, editTarget }: { open: boolean; editTarget: { id: number } | null }) => (
    open ? <div>form-dialog:{editTarget?.id ?? "create"}</div> : null
  ),
}));

import { VehicleRunManager } from "./VehicleRunManager";

const row = { id: 3, departsAt: "2026-07-26T07:30:00", note: "본당 앞 출발", version: 2 };
const page = (content: unknown[], totalPages = 1) => ({
  content,
  page: { size: 10, number: 0, totalElements: content.length, totalPages },
});

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  searchParamsRef.current = new URLSearchParams("");
});
afterEach(() => vi.clearAllMocks());
const renderManager = () =>
  render(
    <QueryClientProvider client={qc}>
      <VehicleRunManager />
    </QueryClientProvider>,
  );

describe("VehicleRunManager", () => {
  it("목록 렌더 + 명단 링크(표시용 departsAt 쿼리)", async () => {
    listMock.mockResolvedValue(page([row]));
    renderManager();
    await waitFor(() => expect(screen.getByText("본당 앞 출발")).toBeDefined());
    const roster = screen.getByRole("link", { name: /탑승 명단/ });
    expect(roster.getAttribute("href")).toBe(
      "/mypage/manage/vehicle-runs/3?departsAt=2026-07-26T07%3A30%3A00",
    );
  });

  it("새 운행일 버튼 → 생성 다이얼로그", async () => {
    listMock.mockResolvedValue(page([]));
    renderManager();
    fireEvent.click(await screen.findByRole("button", { name: "새 운행일" }));
    expect(screen.getByText("form-dialog:create")).toBeDefined();
  });

  it("수정 버튼 → 행 값 시드 다이얼로그", async () => {
    listMock.mockResolvedValue(page([row]));
    renderManager();
    fireEvent.click(await screen.findByRole("button", { name: /수정/ }));
    expect(screen.getByText("form-dialog:3")).toBeDefined();
  });

  it("삭제 확인 → delete API + 경고문", async () => {
    listMock.mockResolvedValue(page([row]));
    deleteMock.mockResolvedValue(undefined);
    renderManager();
    fireEvent.click(await screen.findByRole("button", { name: /삭제/ }));
    expect(await screen.findByText("탑승 신청 명단도 함께 사라집니다.")).toBeDefined();
    fireEvent.click(screen.getAllByRole("button", { name: "삭제" }).at(-1)!);
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(3));
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/components/admin/vehicles/VehicleRunManager.test.tsx`
Expected: FAIL — `Cannot find module './VehicleRunManager'`

- [ ] **Step 3: 구현** — `src/components/admin/vehicles/VehicleRunManager.tsx`

```tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { typo } from "@/constants/typography";
import { ACTION, CREATE_ICON, createLabel } from "@/constants/actionButton";
import { Button, buttonVariants } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { adminKeys } from "@/lib/admin/queryKeys";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { formatDate, formatClockTime } from "@/lib/date";
import { fetchAdminVehicleRuns, deleteVehicleRun, VEHICLE_ADMIN_PAGE_SIZE } from "@/lib/api/vehicles.admin";
import type { VehicleRunDetailResponse } from "@/lib/api/types";
import { VehicleRunFormDialog } from "./VehicleRunFormDialog";

// vehicle-run-manager(DESIGN.md): 지난 운행 포함 전체 목록(최신 출발순) — URL 구동 페이지네이션.
export function VehicleRunManager() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? "0") || 0;

  const list = useQuery({
    queryKey: adminKeys.list("vehicle-runs", { page, size: VEHICLE_ADMIN_PAGE_SIZE }),
    queryFn: () => fetchAdminVehicleRuns({ page }),
    placeholderData: keepPreviousData,
    retry: false,
  });

  // 조회 실패는 토스트로 알린다(빈 목록과 혼동 방지).
  useEffect(() => {
    if (list.isError) adminOnError()(list.error);
  }, [list.isError, list.error]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<VehicleRunDetailResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VehicleRunDetailResponse | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => deleteVehicleRun(id),
    onError: adminOnError(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.listAll("vehicle-runs") });
      qc.invalidateQueries({ queryKey: ["vehicle-runs"] }); // 운영자 겸 교인 세션의 회원 목록 동기화
      notify.success("삭제했습니다.");
      setDeleteTarget(null);
    },
  });

  const departLabel = (r: VehicleRunDetailResponse) => `${formatDate(r.departsAt)} ${formatClockTime(r.departsAt)}`;

  const columns: Column<VehicleRunDetailResponse>[] = [
    { key: "departsAt", header: "출발 시각", cell: (r) => <span className={typo.datetime}>{departLabel(r)}</span> },
    { key: "note", header: "메모", cell: (r) => r.note ?? "" },
  ];

  const pageMeta = list.data?.page;
  return (
    <>
      <div className="flex justify-end">
        <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
          <CREATE_ICON size={18} aria-hidden />
          {createLabel("운행일")}
        </Button>
      </div>
      <div className="mt-base">
        <DataTable
          columns={columns}
          rows={list.data?.content ?? []}
          rowKey={(r) => r.id}
          loading={list.isPending}
          empty={<EmptyState message="등록된 운행일이 없습니다." />}
          actions={(r) => (
            <div className="flex justify-end gap-xs">
              {/* 단건 GET 없음 — 명단 페이지 제목용 출발시각을 표시 전용 쿼리로 전달(스펙 §6). */}
              <Link
                href={`/mypage/manage/vehicle-runs/${r.id}?departsAt=${encodeURIComponent(r.departsAt)}`}
                aria-label={`${departLabel(r)} 탑승 명단`}
                className={buttonVariants("tertiary")}
              >
                <Users size={18} aria-hidden />
                <span className="hidden lg:inline">명단</span>
              </Link>
              <Button type="button" variant="tertiary" aria-label={`${departLabel(r)} 수정`} onClick={() => setEditTarget(r)}>
                <ACTION.edit.Icon size={18} aria-hidden />
                <span className="hidden lg:inline">{ACTION.edit.label}</span>
              </Button>
              <Button type="button" variant="tertiary" aria-label={`${departLabel(r)} 삭제`} onClick={() => setDeleteTarget(r)}>
                <ACTION.delete.Icon size={18} aria-hidden />
                <span className="hidden lg:inline">{ACTION.delete.label}</span>
              </Button>
            </div>
          )}
        />
      </div>
      {pageMeta && pageMeta.totalPages > 1 ? (
        <div className="mt-xl">
          <Pagination page={pageMeta} scroll={false} />
        </div>
      ) : null}

      <VehicleRunFormDialog open={createOpen} onOpenChange={setCreateOpen} editTarget={null} />
      <VehicleRunFormDialog
        open={editTarget != null}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        editTarget={editTarget}
      />
      <DeleteConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title={deleteTarget ? `${departLabel(deleteTarget)} 운행일을 삭제할까요?` : "운행일을 삭제할까요?"}
        warning="탑승 신청 명단도 함께 사라집니다."
        pending={remove.isPending}
        onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id); }}
      />
    </>
  );
}
```

- [ ] **Step 4: 관리 페이지 작성** — `src/app/(site)/mypage/manage/vehicle-runs/page.tsx` (inquiries 페이지 동형)

```tsx
import { Suspense } from "react";
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { VehicleRunManager } from "@/components/admin/vehicles/VehicleRunManager";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 운영 전용 화면(manage-hub → kind:"manage"). 부모 manage/layout이 로그인 가드, 여기서 VEHICLE_MANAGE 게이트.
export default function ManageVehicleRunsPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>차량운행 관리</h1>
      <div className="mt-xl">
        <RequirePermission permission="VEHICLE_MANAGE" fallback={<EditAccessDenied />}>
          {/* VehicleRunManager는 useSearchParams 사용 → 정적 프리렌더 빌드 위해 Suspense 경계 필수(inquiries 선례) */}
          <Suspense fallback={null}>
            <VehicleRunManager />
          </Suspense>
        </RequirePermission>
      </div>
    </Container>
  );
}
```

- [ ] **Step 5: 허브 카드 추가** — `src/lib/admin/manageDomains.ts`

`MANAGE_CATEGORIES`의 inbox 라벨 변경(문의·탑승 신청의 공통 상위어 — 교회가 '받는' 것):

```ts
  { key: "inbox", label: "접수" }, // 교회가 '받는' 것(문의·차량 탑승 신청) — 나머지 카테고리는 전부 '내보내는' 것이라 분리
```

`MANAGE_DOMAINS`의 inquiries 줄 아래에:

```ts
  { key: "vehicle-runs", label: "차량운행 관리", permission: "VEHICLE_MANAGE", href: "/mypage/manage/vehicle-runs", kind: "manage", category: "inbox" },
```

- [ ] **Step 6: 통과 확인 (허브·기존 테스트 회귀 포함)**

Run: `pnpm vitest run src/components/admin/vehicles/VehicleRunManager.test.tsx src/components/mypage`
Expected: PASS. `ManageHub.test` 등에서 카테고리 라벨 "문의"를 기대하는 단언이 있으면 "접수"로 갱신한다.

- [ ] **Step 7: 커밋**

```bash
git add src/components/admin/vehicles/VehicleRunManager.tsx src/components/admin/vehicles/VehicleRunManager.test.tsx "src/app/(site)/mypage/manage/vehicle-runs/page.tsx" src/lib/admin/manageDomains.ts
git commit -m "feat : 어드민 차량 운행일 관리 화면·허브 카드 추가 #<N>"
```

(ManageHub 테스트 갱신이 있으면 해당 파일도 같은 커밋에 포함)

---

### Task 10: 탑승 명단 하위 페이지

**Files:**
- Create: `src/components/admin/vehicles/VehicleRosterView.tsx`
- Create: `src/app/(site)/mypage/manage/vehicle-runs/[id]/page.tsx`
- Test: `src/components/admin/vehicles/VehicleRosterView.test.tsx`

**Interfaces:**
- Consumes: Task 2 `fetchVehicleRoster`, Task 1 `VehicleRosterEntryResponse`
- Produces: `VehicleRosterView({ runId: number; departsAt?: string })` · 라우트 `/mypage/manage/vehicle-runs/[id]`

- [ ] **Step 1: 실패하는 테스트 작성** — `src/components/admin/vehicles/VehicleRosterView.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { rosterMock } = vi.hoisted(() => ({ rosterMock: vi.fn() }));
vi.mock("@/lib/api/vehicles.admin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/vehicles.admin")>()),
  fetchVehicleRoster: rosterMock,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/mypage/manage/vehicle-runs/3",
  useSearchParams: () => new URLSearchParams(""),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { VehicleRosterView } from "./VehicleRosterView";

const entry = {
  name: "홍길동", phone: "010-1234-5678", pickupLocation: "○○아파트 정문",
  note: "2명", requestedAt: "2026-07-20T21:00:00",
};
const page = (content: unknown[], totalPages = 1) => ({
  content,
  page: { size: 20, number: 0, totalElements: content.length, totalPages },
});

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => vi.clearAllMocks());

describe("VehicleRosterView", () => {
  it("명단 렌더 — 연락처는 tel: 링크", async () => {
    rosterMock.mockResolvedValue(page([entry]));
    render(
      <QueryClientProvider client={qc}>
        <VehicleRosterView runId={3} departsAt="2026-07-26T07:30:00" />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText("홍길동")).toBeDefined());
    expect(screen.getByRole("link", { name: "010-1234-5678" }).getAttribute("href")).toBe("tel:010-1234-5678");
    expect(screen.getByText("○○아파트 정문")).toBeDefined();
    expect(rosterMock).toHaveBeenCalledWith(3, { page: 0 });
  });

  it("유효한 departsAt이면 출발시각 부제 표시, 깨진 값이면 생략", async () => {
    rosterMock.mockResolvedValue(page([]));
    const { unmount } = render(
      <QueryClientProvider client={qc}>
        <VehicleRosterView runId={3} departsAt="2026-07-26T07:30:00" />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText(/출발$/)).toBeDefined());
    unmount();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <VehicleRosterView runId={3} departsAt="garbage" />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.queryByText(/출발$/)).toBeNull());
  });

  it("빈 명단 안내", async () => {
    rosterMock.mockResolvedValue(page([]));
    render(
      <QueryClientProvider client={qc}>
        <VehicleRosterView runId={3} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("아직 탑승 신청이 없습니다.")).toBeDefined();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/components/admin/vehicles/VehicleRosterView.test.tsx`
Expected: FAIL — `Cannot find module './VehicleRosterView'`

- [ ] **Step 3: 구현** — `src/components/admin/vehicles/VehicleRosterView.tsx`

```tsx
"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { buttonVariants } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { formatDate, formatClockTime, parseServerDate } from "@/lib/date";
import { fetchVehicleRoster } from "@/lib/api/vehicles.admin";
import type { VehicleRosterEntryResponse } from "@/lib/api/types";

export interface VehicleRosterViewProps {
  runId: number;
  departsAt?: string; // 표시 전용(단건 GET 없음 — 목록에서 쿼리로 전달, 위·변조 무해)
}

// vehicle-roster-view(DESIGN.md): 통합 명단(신청순) — 현장에서 연락처 바로 전화(tel:).
export function VehicleRosterView({ runId, departsAt }: VehicleRosterViewProps) {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? "0") || 0;

  const roster = useQuery({
    queryKey: ["admin", "vehicle-runs", runId, "roster", { page }],
    queryFn: () => fetchVehicleRoster(runId, { page }),
    placeholderData: keepPreviousData,
    retry: false,
  });

  useEffect(() => {
    if (roster.isError) adminOnError()(roster.error);
  }, [roster.isError, roster.error]);

  // 유효한 서버 datetime일 때만 부제 표시(직접 URL 진입·깨진 값 방어).
  const subtitle =
    departsAt && !Number.isNaN(parseServerDate(departsAt).getTime())
      ? `${formatDate(departsAt)} ${formatClockTime(departsAt)} 출발`
      : null;

  const columns: Column<VehicleRosterEntryResponse>[] = [
    { key: "name", header: "이름", cell: (e) => e.name },
    {
      key: "phone",
      header: "연락처",
      cell: (e) =>
        e.phone ? (
          <a href={`tel:${e.phone}`} className={cn(typo.datetime, "text-ink underline-offset-4 hover:text-primary hover:underline")}>
            {e.phone}
          </a>
        ) : null,
    },
    { key: "pickupLocation", header: "픽업 장소", cell: (e) => e.pickupLocation },
    { key: "note", header: "메모", cell: (e) => e.note ?? "" },
    {
      key: "requestedAt",
      header: "신청 시각",
      cell: (e) => <span className={typo.datetime}>{`${formatDate(e.requestedAt)} ${formatClockTime(e.requestedAt)}`}</span>,
    },
  ];

  const pageMeta = roster.data?.page;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-base">
        {subtitle ? <p className={cn(typo.datetimeLg, "text-muted")}>{subtitle}</p> : <span />}
        <Link href="/mypage/manage/vehicle-runs" className={buttonVariants("tertiary")}>
          <ArrowLeft size={18} aria-hidden />
          목록으로
        </Link>
      </div>
      <div className="mt-base">
        <DataTable
          columns={columns}
          rows={roster.data?.content ?? []}
          rowKey={(e) => `${e.name}-${e.phone ?? ""}-${e.requestedAt}`}
          loading={roster.isPending}
          empty={<EmptyState message="아직 탑승 신청이 없습니다." />}
        />
      </div>
      {pageMeta && pageMeta.totalPages > 1 ? (
        <div className="mt-xl">
          <Pagination page={pageMeta} scroll={false} />
        </div>
      ) : null}
    </>
  );
}
```

- [ ] **Step 4: 페이지 작성** — `src/app/(site)/mypage/manage/vehicle-runs/[id]/page.tsx`

```tsx
import { Suspense } from "react";
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { VehicleRosterView } from "@/components/admin/vehicles/VehicleRosterView";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 운영 전용 — 부모 manage/layout이 로그인 가드, 여기서 VEHICLE_MANAGE 게이트.
// params/searchParams는 Promise(Next 16 — challenges/[id] 선례).
export default async function VehicleRosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ departsAt?: string }>;
}) {
  const { id } = await params;
  const { departsAt } = await searchParams;
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>탑승 명단</h1>
      <div className="mt-xl">
        <RequirePermission permission="VEHICLE_MANAGE" fallback={<EditAccessDenied />}>
          {/* VehicleRosterView는 useSearchParams 사용 → Suspense 경계(inquiries 선례) */}
          <Suspense fallback={null}>
            <VehicleRosterView runId={Number(id)} departsAt={departsAt} />
          </Suspense>
        </RequirePermission>
      </div>
    </Container>
  );
}
```

- [ ] **Step 5: 통과 확인**

Run: `pnpm vitest run src/components/admin/vehicles/VehicleRosterView.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/components/admin/vehicles/VehicleRosterView.tsx src/components/admin/vehicles/VehicleRosterView.test.tsx "src/app/(site)/mypage/manage/vehicle-runs/[id]/page.tsx"
git commit -m "feat : 운행일별 탑승 명단 페이지 추가 #<N>"
```

---

### Task 11: 전체 검증

- [ ] **Step 1: 전체 테스트**

Run: `pnpm test`
Expected: 전체 PASS (기존 테스트 회귀 0 — 특히 navigation·ManageHub)

- [ ] **Step 2: 타입 체크** (lint는 타입체크를 안 한다 — 전역 규칙)

Run: `npx tsc --noEmit`
Expected: 오류 0

- [ ] **Step 3: 린트**

Run: `pnpm lint`
Expected: 오류 0 (effect 내 setState 금지 규칙 등)

- [ ] **Step 4: 잔여 수정이 있으면 fix 커밋 후 종료**

```bash
git status
```
Expected: working tree clean. 이후 브랜치 정리는 superpowers:finishing-a-development-branch 스킬로.
