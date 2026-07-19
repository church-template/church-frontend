# 설교 회원전용 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설교 목록·상세를 갤러리와 동일한 회원전용(`SERMON_VIEW`)으로 전환하고, 게이트를 공용 `MemberGate`로 추출한다.

**Architecture:** 백엔드는 이미 `GET /api/sermons*`에 `SERMON_VIEW`를 요구한다(완료). 프론트는 설교를 공개 영역(RSC fetch+ISR)에서 회원 영역(클라 TanStack Query + `authFetch`)으로 옮긴다 — 갤러리 구현(AlbumList·AlbumDetail·AlbumEditLoader·queries)을 그대로 미러링. `GalleryGate`는 props(`permission`·`domainLabel`·`skeleton`)를 받는 `MemberGate`로 일반화하고 갤러리 호출부 4곳을 교체한다.

**Tech Stack:** Next.js App Router(RSC 셸 + 클라 island), TanStack Query, authFetch, vitest + @testing-library/react.

**스펙:** `docs/superpowers/specs/2026-07-20-sermon-member-gating-design.md`

## Global Constraints

- 답변·주석은 한국어. 주석은 WHY 중심, 주변 스타일에 맞춘다.
- hex·px 인라인 금지 — `typo.*`·토큰 유틸만 사용. UI 이모지 금지, 아이콘은 `lucide-react`.
- JSX 조건부는 삼항(`{cond ? <X/> : null}`), `&&` 금지(cn() 내부 제외).
- 테스트 관례: vitest `globals:false` 명시 import, jest-dom 없음(`getAttribute`/`toBeDefined`), next/link mock은 plain `<a>`, mock 컴포넌트는 엘리먼트/문자열 반환.
- 커밋 메시지: `<type> : <설명> #<이슈번호>`. **첫 커밋 전 이슈 번호를 사용자에게 확인**하고 아래 `#N`을 치환한다. Co-Authored-By 태그 절대 금지.
- 파일 삭제 3건은 스펙에서 사용자 승인됨: `GalleryGate.tsx`(+테스트는 MemberGate로 이전), `sermons/loading.tsx`, `sermons/[id]/loading.tsx`.
- **중간 상태 주의**: Task 2에서 `sermons.ts`에 `authFetch`가 들어간 뒤 Task 5에서 RSC import가 모두 사라질 때까지 `pnpm build`는 실패할 수 있다(서버 번들에 클라 체인 포함). vitest·tsc·lint는 무관 — 각 Task의 게이트는 lint+tsc+test, build는 Task 7에서 최종 검증.
- 각 Task 완료 게이트: `pnpm lint && npx tsc --noEmit && pnpm test` 전체 통과.

## 후속 후보 (이번 스코프 아님 — 구현하지 말 것)

- `ChallengeGate`(`src/components/challenges/ChallengeGate.tsx`)는 GalleryGate의 세 번째 복제본이다.
  안내 문구 패턴("참여는")과 스켈레톤이 달라 `deniedBody` 오버라이드 prop이 필요 — 별도 작업으로 MemberGate 흡수 가능. 이번엔 건드리지 않는다.
- `AlbumEditLoader`/`SermonEditLoader`의 keyed 마운트는 `id` 키라 409 재편집 invalidate 후에도
  폼이 리마운트되지 않는 잠재 갭이 있다(갤러리 기존 동작). 이번엔 갤러리 관례 그대로 미러링만 한다.

---

### Task 1: MemberGate 공용 추출 + 갤러리 교체

**Files:**
- Create: `src/components/common/MemberGate.tsx`
- Create: `src/components/common/MemberGate.test.tsx`
- Modify: `src/app/(site)/gallery/page.tsx`
- Modify: `src/app/(site)/gallery/albums/new/page.tsx`
- Modify: `src/app/(site)/gallery/albums/[id]/page.tsx`
- Modify: `src/app/(site)/gallery/albums/[id]/edit/page.tsx`
- Delete: `src/components/gallery/GalleryGate.tsx`
- Delete: `src/components/gallery/GalleryGate.test.tsx`

**Interfaces:**
- Produces: `MemberGate({ permission: string; domainLabel: string; skeleton?: ReactNode; children: ReactNode })` — 이후 Task 3·4·5가 `<MemberGate permission="SERMON_VIEW" domainLabel="설교">`로 소비.

- [ ] **Step 1: 실패하는 테스트 작성** — `src/components/common/MemberGate.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const { useMeMock } = vi.hoisted(() => ({ useMeMock: vi.fn() }));
vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock }));
vi.mock("next/navigation", () => ({ usePathname: () => "/gallery" }));

import { MemberGate } from "./MemberGate";
import { useAuthStore } from "@/lib/auth/authStore";

const Child = () => <div>MEMBER CONTENT</div>;

function renderGate(props: Partial<{ permission: string; domainLabel: string; skeleton: ReactNode }> = {}) {
  return render(
    <MemberGate
      permission={props.permission ?? "GALLERY_VIEW"}
      domainLabel={props.domainLabel ?? "갤러리"}
      skeleton={props.skeleton}
    >
      <Child />
    </MemberGate>,
  );
}

beforeEach(() => {
  useMeMock.mockReset();
  useAuthStore.setState({ accessToken: null, refreshToken: null, member: null });
});

describe("MemberGate", () => {
  it("비로그인이면 isPending이어도 로그인 안내를 보이고 children을 막는다", async () => {
    useMeMock.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    renderGate();
    expect(await screen.findByText("로그인 후 이용 가능합니다")).toBeDefined();
    expect(screen.getByText("갤러리는 교인 전용입니다. 로그인해 주세요.")).toBeDefined();
    expect(screen.queryByText("MEMBER CONTENT")).toBeNull();
    expect(screen.getByRole("link", { name: "로그인" }).getAttribute("href")).toBe("/login?next=%2Fgallery");
  });

  it("로그인+로딩이면 children도 안내도 없다(기본 스켈레톤)", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    renderGate();
    await waitFor(() => expect(screen.queryByText("MEMBER CONTENT")).toBeNull());
    expect(screen.queryByText("로그인 후 이용 가능합니다")).toBeNull();
    expect(screen.queryByText("교인 승인 후 이용 가능합니다")).toBeNull();
    expect(screen.getByTestId("member-gate-skeleton")).toBeDefined();
  });

  it("커스텀 스켈레톤을 주면 기본 대신 그것을 렌더한다", () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    renderGate({ skeleton: <p>CUSTOM SKELETON</p> });
    expect(screen.getByText("CUSTOM SKELETON")).toBeDefined();
    expect(screen.queryByTestId("member-gate-skeleton")).toBeNull();
  });

  it("에러면 다시 시도 안내", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch: vi.fn() });
    renderGate();
    expect(await screen.findByText("정보를 불러오지 못했습니다")).toBeDefined();
  });

  it("권한 없으면 도메인 라벨이 든 교인 승인 안내, children 차단", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: { permissions: [] }, isPending: false, isError: false, refetch: vi.fn() });
    renderGate({ permission: "SERMON_VIEW", domainLabel: "설교" });
    expect(await screen.findByText("교인 승인 후 이용 가능합니다")).toBeDefined();
    expect(screen.getByText("설교 열람은 교인 승인(MEMBER) 후 가능합니다. 교회로 문의해 주세요.")).toBeDefined();
    expect(screen.queryByText("MEMBER CONTENT")).toBeNull();
  });

  it("지정 권한 보유면 children 렌더", async () => {
    useAuthStore.setState({ accessToken: "t" });
    useMeMock.mockReturnValue({ data: { permissions: ["SERMON_VIEW"] }, isPending: false, isError: false, refetch: vi.fn() });
    renderGate({ permission: "SERMON_VIEW", domainLabel: "설교" });
    expect(await screen.findByText("MEMBER CONTENT")).toBeDefined();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/components/common/MemberGate.test.tsx`
Expected: FAIL — `MemberGate` 모듈 없음.

- [ ] **Step 3: 구현** — `src/components/common/MemberGate.tsx` (GalleryGate 로직 이동 + props화)

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

export interface MemberGateProps {
  /** 필요 권한 문자열(가이드 2.1 — roles·직분 아님) */
  permission: string;
  /** 안내 문구의 도메인 자리 — "갤러리"·"설교" */
  domainLabel: string;
  /** 하이드레이션·me 로딩 중 표시(기본: 카드 그리드 스켈레톤) */
  skeleton?: ReactNode;
  children: ReactNode;
}

// 회원전용 게이트(가이드 2.3, 갤러리·설교 공용). 권한 없으면 children을 마운트하지 않아 API 호출 0회.
// 분기 순서 중요: useMe는 enabled:!!accessToken이라 비로그인 시 isPending이 영구 true →
// !accessToken을 isPending보다 먼저 평가한다(아니면 비로그인에게 Skeleton이 영구 노출).
export function MemberGate({ permission, domainLabel, skeleton, children }: MemberGateProps) {
  const pathname = usePathname();
  const hydrated = useHasHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: me, isPending, isError, refetch } = useMe();

  const pending = skeleton ?? <GateSkeleton />;

  // persist 하이드레이션 전 첫 페인트에서 토큰이 null로 보여 로그인 안내가 깜빡이는 것 방지.
  if (!hydrated) return <>{pending}</>;

  if (!accessToken) {
    return (
      <GateNotice
        title="로그인 후 이용 가능합니다"
        body={`${domainLabel}는 교인 전용입니다. 로그인해 주세요.`}
        action={
          <Link
            href={`/login?next=${encodeURIComponent(sanitizeNext(pathname))}`}
            className={buttonVariants("primary")}
          >
            로그인
          </Link>
        }
      />
    );
  }
  if (isPending) return <>{pending}</>;
  if (isError || !me) {
    return (
      <GateNotice
        title="정보를 불러오지 못했습니다"
        body="잠시 후 다시 시도해 주세요."
        action={
          <Button variant="secondary" onClick={() => refetch()}>
            다시 시도
          </Button>
        }
      />
    );
  }
  if (!hasPermission(permission, me)) {
    return (
      <GateNotice
        title="교인 승인 후 이용 가능합니다"
        body={`${domainLabel} 열람은 교인 승인(MEMBER) 후 가능합니다. 교회로 문의해 주세요.`}
      />
    );
  }
  return <>{children}</>;
}

function GateSkeleton() {
  return (
    <div data-testid="member-gate-skeleton" className="mt-xl grid gap-base sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full rounded-xl" />
      ))}
    </div>
  );
}

function GateNotice({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div role="status" className="mt-xl flex flex-col items-center gap-sm py-xxl text-center">
      <p className={cn(typo.titleMd, "text-ink")}>{title}</p>
      <p className={cn(typo.bodyMd, "text-muted")}>{body}</p>
      {action ? <div className="mt-sm">{action}</div> : null}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/components/common/MemberGate.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: 갤러리 호출부 4곳 교체**

각 파일에서 import 한 줄과 JSX 태그를 교체한다. **4곳 모두 동일 패턴:**

```tsx
// 교체 전
import { GalleryGate } from "@/components/gallery/GalleryGate";
// 교체 후
import { MemberGate } from "@/components/common/MemberGate";
```

```tsx
// 교체 전
<GalleryGate>
  ...
</GalleryGate>
// 교체 후
<MemberGate permission="GALLERY_VIEW" domainLabel="갤러리">
  ...
</MemberGate>
```

대상: `src/app/(site)/gallery/page.tsx`, `src/app/(site)/gallery/albums/new/page.tsx`,
`src/app/(site)/gallery/albums/[id]/page.tsx`, `src/app/(site)/gallery/albums/[id]/edit/page.tsx`

- [ ] **Step 6: GalleryGate 삭제** (사용자 승인됨)

```bash
rm src/components/gallery/GalleryGate.tsx src/components/gallery/GalleryGate.test.tsx
```

- [ ] **Step 7: 전체 게이트**

Run: `pnpm lint && npx tsc --noEmit && pnpm test`
Expected: 전부 PASS — GalleryGate 참조 잔존 시 tsc가 잡는다.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor : 회원전용 게이트 MemberGate 공용 추출 (갤러리 4곳 적용) #N"
```

---

### Task 2: 설교 API 클라 함수 + 쿼리 훅

**Files:**
- Modify: `src/lib/api/sermons.ts` (fetch* 추가 — 기존 `getSermons`/`getSermon`은 Task 5까지 유지)
- Modify: `src/lib/api/sermons.test.ts` (fetch* 테스트 추가)
- Create: `src/components/sermons/queries.ts`
- Create: `src/components/sermons/queries.test.tsx`

**Interfaces:**
- Consumes: `authFetch(path)` (`@/lib/auth/authFetch`), `parseJson<T>(res)` (`@/lib/auth/apiError`), 기존 `buildSermonQuery`·`SermonListParams`.
- Produces: `fetchSermons(p: SermonListParams): Promise<Page<SermonCardResponse>>`, `fetchSermon(id: number): Promise<SermonDetailResponse>`, `useSermons(params)`, `useSermon(id)`, `useSermonTags()` — Task 3·4·5가 소비.

- [ ] **Step 1: 실패하는 테스트 추가** — `src/lib/api/sermons.test.ts` 상단에 authFetch mock, 하단에 describe 2개 추가

파일 상단 import 아래(기존 `afterEach` 위)에 추가:

```ts
const authFetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));
```

import 라인을 fetch* 포함으로 교체:

```ts
import { buildSermonQuery, getSermons, getSermon, fetchSermons, fetchSermon } from "./sermons";
```

파일 끝에 추가:

```ts
function jsonRes(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("fetchSermons", () => {
  it("authFetch로 '/api/sermons'+쿼리를 호출하고 봉투를 파싱한다", async () => {
    authFetchMock.mockResolvedValue(
      jsonRes({ content: [{ id: 1, title: "A" }], page: { size: 12, number: 0, totalElements: 1, totalPages: 1 } }),
    );
    const data = await fetchSermons({ tagId: 3, q: "grace" });
    expect(authFetchMock).toHaveBeenCalledWith("/api/sermons?tagId=3&q=grace");
    expect(data.content[0].id).toBe(1);
  });
});

describe("fetchSermon", () => {
  it("authFetch로 '/api/sermons/{id}'를 호출하고 상세를 반환한다", async () => {
    authFetchMock.mockResolvedValue(jsonRes({ id: 7, title: "T" }));
    const s = await fetchSermon(7);
    expect(authFetchMock).toHaveBeenCalledWith("/api/sermons/7");
    expect(s.id).toBe(7);
  });
});
```

(기존 `afterEach(() => vi.unstubAllGlobals())`는 유지, `beforeEach(() => authFetchMock.mockReset())`를 추가한다.)

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/lib/api/sermons.test.ts`
Expected: FAIL — `fetchSermons` export 없음.

- [ ] **Step 3: 구현** — `src/lib/api/sermons.ts`에 추가

파일 상단 import에 추가:

```ts
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
```

`getSermon` 아래에 추가:

```ts
// ── 회원전용 클라 조회(SERMON_VIEW, 가이드 2.3) — 게이트(MemberGate) 통과 후 TanStack Query에서 호출. ──

// 목록(회원전용). /api/sermons는 토큰 필요 → authFetch.
export async function fetchSermons(
  p: SermonListParams = {},
): Promise<Page<SermonCardResponse>> {
  const res = await authFetch(`/api/sermons${buildSermonQuery(p)}`);
  return parseJson<Page<SermonCardResponse>>(res);
}

// 상세(회원전용). GET마다 조회수+1(부수효과). 404 특수 처리 없음 — 클라에서 에러 안내(갤러리 관례).
export async function fetchSermon(id: number): Promise<SermonDetailResponse> {
  const res = await authFetch(`/api/sermons/${id}`);
  return parseJson<SermonDetailResponse>(res);
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/lib/api/sermons.test.ts`
Expected: PASS

- [ ] **Step 5: 실패하는 훅 테스트 작성** — `src/components/sermons/queries.test.tsx` (gallery `queries.test.tsx` 동형)

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

const { fetchSermonsMock, fetchSermonMock, getTagsMock } = vi.hoisted(() => ({
  fetchSermonsMock: vi.fn(),
  fetchSermonMock: vi.fn(),
  getTagsMock: vi.fn(),
}));
vi.mock("@/lib/api/sermons", () => ({ fetchSermons: fetchSermonsMock, fetchSermon: fetchSermonMock }));
vi.mock("@/lib/api/tags", () => ({ getTags: getTagsMock }));

import { useSermons, useSermon, useSermonTags } from "./queries";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  fetchSermonsMock.mockReset();
  fetchSermonMock.mockReset();
  getTagsMock.mockReset();
});

describe("useSermons", () => {
  it("fetchSermons 결과를 반환하고 params를 전달한다", async () => {
    fetchSermonsMock.mockResolvedValue({ content: [{ id: 1 }], page: { size: 12, number: 0, totalElements: 1, totalPages: 1 } });
    const { result } = renderHook(() => useSermons({ page: 0, tagId: 2 }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSermonsMock).toHaveBeenCalledWith({ page: 0, tagId: 2 });
    expect(result.current.data?.content[0].id).toBe(1);
  });
});

describe("useSermon", () => {
  it("fetchSermon(id) 결과를 반환한다", async () => {
    fetchSermonMock.mockResolvedValue({ id: 9, title: "Z", tags: [], preachedAt: "2026-07-19", viewCount: 0, version: 0 });
    const { result } = renderHook(() => useSermon(9), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSermonMock).toHaveBeenCalledWith(9);
    expect(result.current.data?.id).toBe(9);
  });
});

describe("useSermonTags", () => {
  it("getTags(공개 fetch) 결과를 반환한다", async () => {
    getTagsMock.mockResolvedValue([{ id: 1, name: "주일" }]);
    const { result } = renderHook(() => useSermonTags(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe("주일");
  });
});
```

- [ ] **Step 6: 실패 확인**

Run: `pnpm test src/components/sermons/queries.test.tsx`
Expected: FAIL — `./queries` 모듈 없음.

- [ ] **Step 7: 구현** — `src/components/sermons/queries.ts` (gallery `queries.ts` 동형)

```ts
"use client";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getTags } from "@/lib/api/tags";
import { fetchSermons, fetchSermon, type SermonListParams } from "@/lib/api/sermons";

// 게이트(MemberGate) 통과 후에만 마운트되므로 별도 enabled 게이팅은 불필요(게이트가 통제).
// retry:false — 401 refresh·재시도는 authFetch가 처리(이중 재시도 방지).
export function useSermons(params: SermonListParams) {
  return useQuery({
    queryKey: ["sermons", params],
    queryFn: () => fetchSermons(params),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useSermon(id: number) {
  return useQuery({
    queryKey: ["sermon", id],
    queryFn: () => fetchSermon(id),
    retry: false,
  });
}

// /api/tags는 공개(가이드 2.3·6.1) — 기존 getTags(plain fetch) 재사용(토큰 미부착). TagFilter용.
export function useSermonTags() {
  return useQuery({ queryKey: ["tags"], queryFn: getTags, retry: false });
}
```

- [ ] **Step 8: 통과 + 전체 게이트**

Run: `pnpm test src/components/sermons/queries.test.tsx` → PASS
Run: `pnpm lint && npx tsc --noEmit && pnpm test` → 전부 PASS

- [ ] **Step 9: Commit**

```bash
git add src/lib/api/sermons.ts src/lib/api/sermons.test.ts src/components/sermons/queries.ts src/components/sermons/queries.test.tsx
git commit -m "feat : 설교 회원전용 API 클라 함수·쿼리 훅 추가 #N"
```

---

### Task 3: SermonList + 목록 페이지 전환

**Files:**
- Create: `src/components/sermons/SermonList.tsx`
- Create: `src/components/sermons/SermonList.test.tsx`
- Modify: `src/app/(site)/sermons/page.tsx` (전체 교체)
- Delete: `src/app/(site)/sermons/loading.tsx`

**Interfaces:**
- Consumes: `useSermons`·`useSermonTags`(Task 2), `MemberGate`(Task 1), 기존 `SermonCard`·`TagFilter`·`Pagination`·`EmptyState`·`CardGridSkeleton`·`SermonSearch`·`ActiveFilters`·`SermonListAction`(무수정).
- Produces: `SermonList()` — 목록 페이지 셸이 소비.

- [ ] **Step 1: 실패하는 테스트 작성** — `src/components/sermons/SermonList.test.tsx` (AlbumList.test 동형)

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

// next/link → plain <a> (프로젝트 테스트 컨벤션)
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const { useSermonsMock, useSermonTagsMock } = vi.hoisted(() => ({
  useSermonsMock: vi.fn(),
  useSermonTagsMock: vi.fn(),
}));
vi.mock("./queries", () => ({ useSermons: useSermonsMock, useSermonTags: useSermonTagsMock }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("") }));
// 자식 컴포넌트 격리 — URL 조작 동작은 각자 테스트(SermonSearch.test 등)에서 검증.
vi.mock("./SermonSearch", () => ({ SermonSearch: () => null }));
vi.mock("./ActiveFilters", () => ({ ActiveFilters: () => null }));
vi.mock("@/components/common/TagFilter", () => ({ TagFilter: () => null }));
vi.mock("@/components/common/Pagination", () => ({ Pagination: () => "PAGINATION" }));

import { SermonList } from "./SermonList";

function state(over: Record<string, unknown>) {
  return { data: undefined, isPending: false, isError: false, refetch: vi.fn(), ...over };
}
const card = {
  id: 1, title: "주일설교", preacher: "김목사", series: null, scripture: null,
  preachedAt: "2026-07-19", viewCount: 0, tags: [],
};
const page = { size: 12, number: 0, totalElements: 1, totalPages: 1 };

beforeEach(() => {
  useSermonsMock.mockReset();
  useSermonTagsMock.mockReturnValue({ data: [], isPending: false, isError: false });
});

describe("SermonList", () => {
  it("로딩 중엔 카드 링크가 없다(스켈레톤)", () => {
    useSermonsMock.mockReturnValue(state({ isPending: true }));
    render(<SermonList />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("빈 배열이면 EmptyState를 보인다", () => {
    useSermonsMock.mockReturnValue(state({ data: { content: [], page: { ...page, totalElements: 0, totalPages: 0 } } }));
    render(<SermonList />);
    expect(screen.getByText("조건에 맞는 설교가 없습니다.")).toBeDefined();
  });

  it("설교가 있으면 카드 그리드를 보인다", () => {
    useSermonsMock.mockReturnValue(state({ data: { content: [card], page } }));
    render(<SermonList />);
    expect(screen.getByText("주일설교")).toBeDefined();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/sermons/1");
  });

  it("여러 페이지면 페이지네이션을 보인다", () => {
    useSermonsMock.mockReturnValue(state({ data: { content: [card], page: { ...page, totalElements: 30, totalPages: 3 } } }));
    render(<SermonList />);
    expect(screen.queryByText("PAGINATION")).not.toBeNull();
  });

  it("한 페이지면 페이지네이션을 숨긴다", () => {
    useSermonsMock.mockReturnValue(state({ data: { content: [card], page } }));
    render(<SermonList />);
    expect(screen.queryByText("PAGINATION")).toBeNull();
  });

  it("에러면 다시 시도 버튼을 보이고, 클릭하면 refetch를 호출한다", () => {
    const refetch = vi.fn();
    useSermonsMock.mockReturnValue(state({ isError: true, refetch }));
    render(<SermonList />);
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(refetch).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/components/sermons/SermonList.test.tsx`
Expected: FAIL — `SermonList` 모듈 없음.

- [ ] **Step 3: 구현** — `src/components/sermons/SermonList.tsx`

```tsx
"use client";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { TagFilter } from "@/components/common/TagFilter";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { CardGridSkeleton } from "@/components/common/CardGridSkeleton";
import { formatDate } from "@/lib/date";
import { SermonCard } from "@/components/cards/SermonCard";
import type { SermonListParams } from "@/lib/api/sermons";
import { SermonSearch } from "./SermonSearch";
import { ActiveFilters } from "./ActiveFilters";
import { useSermons, useSermonTags } from "./queries";

// URL 파라미터 정규화 — RSC 시절 parseParams와 동일 검증(useSearchParams는 string|null 시그니처).
function toStr(v: string | null): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}
function toNum(v: string | null): number | undefined {
  const s = toStr(v);
  if (s == null) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined; // NaN 방어
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// 날짜 필터는 yyyy-MM-dd 형식만 통과(비정상 값 백엔드 전달 차단).
function toDate(v: string | null): string | undefined {
  const s = toStr(v);
  return s && DATE_RE.test(s) ? s : undefined;
}

// 목록 클라이언트 — URL(?page·?tagId·?q·?preacher·?series·?from·?to)을 쿼리로,
// 검색/필터/페이지네이션은 URL 갱신 → useSearchParams 재파싱으로 동작(AlbumList 패턴).
export function SermonList() {
  const searchParams = useSearchParams();
  const params: SermonListParams = {
    page: toNum(searchParams.get("page")),
    tagId: toNum(searchParams.get("tagId")),
    q: toStr(searchParams.get("q")),
    preacher: toStr(searchParams.get("preacher")),
    series: toStr(searchParams.get("series")),
    from: toDate(searchParams.get("from")),
    to: toDate(searchParams.get("to")),
  };

  const sermons = useSermons(params);
  const tags = useSermonTags();

  return (
    <div className="mt-lg flex flex-col gap-base">
      <SermonSearch />
      <TagFilter tags={tags.data ?? []} />
      <ActiveFilters />

      {sermons.isPending ? (
        <div className="mt-xl">
          <CardGridSkeleton />
        </div>
      ) : sermons.isError || !sermons.data ? (
        <div className="flex flex-col items-start gap-sm py-xl">
          <p className={cn(typo.bodyMd, "text-muted")}>설교를 불러오지 못했습니다.</p>
          <Button variant="secondary" onClick={() => sermons.refetch()}>
            다시 시도
          </Button>
        </div>
      ) : sermons.data.content.length === 0 ? (
        <EmptyState message="조건에 맞는 설교가 없습니다." className="mt-xl" />
      ) : (
        <>
          <div
            aria-busy={sermons.isPlaceholderData}
            className={cn(
              "mt-xl grid gap-base sm:grid-cols-2 lg:grid-cols-3",
              sermons.isPlaceholderData && "opacity-60 transition-opacity",
            )}
          >
            {sermons.data.content.map((s) => (
              <SermonCard
                key={s.id}
                href={`/sermons/${s.id}`}
                title={s.title}
                preacher={s.preacher}
                date={formatDate(s.preachedAt)}
                series={s.series}
                scripture={s.scripture}
                tags={s.tags.map((t) => t.name)}
              />
            ))}
          </div>
          {sermons.data.page.totalPages > 1 ? (
            <div className="mt-xl">
              <Pagination page={sermons.data.page} scroll={false} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/components/sermons/SermonList.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: 목록 페이지 셸 교체** — `src/app/(site)/sermons/page.tsx` 전체를 아래로 교체

```tsx
// src/app/(site)/sermons/page.tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { MemberGate } from "@/components/common/MemberGate";
import { SermonList } from "@/components/sermons/SermonList";
import { SermonListAction } from "@/components/sermons/SermonAdminActions";

export const metadata: Metadata = { title: "설교" };

// 회원전용 설교 목록(가이드 2.3). 게이트가 권한(SERMON_VIEW)을 선판단하고, SermonList가
// useSearchParams로 필터를 읽어 TanStack Query로 조회한다. useSearchParams 때문에 Suspense 경계 필요.
export default function SermonsPage() {
  return (
    <Container as="section" className="py-section">
      {/* 등록 버튼은 공지·일정처럼 제목 행에 — 필터 행에 두면 알약이 폭을 나눠 써 일찍 줄바꿈된다. */}
      <div className="flex items-center justify-between gap-base">
        <h1 className={cn(typo.displayMd, "text-ink")}>설교</h1>
        <SermonListAction />
      </div>
      <Suspense fallback={null}>
        <MemberGate permission="SERMON_VIEW" domainLabel="설교">
          <SermonList />
        </MemberGate>
      </Suspense>
    </Container>
  );
}
```

- [ ] **Step 6: loading.tsx 삭제** (사용자 승인됨 — 서버 fetch가 사라져 무의미)

```bash
rm "src/app/(site)/sermons/loading.tsx"
```

- [ ] **Step 7: 전체 게이트**

Run: `pnpm lint && npx tsc --noEmit && pnpm test`
Expected: 전부 PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat : 설교 목록 회원전용 전환 (MemberGate+클라 패칭) #N"
```

---

### Task 4: SermonDetail + 상세 페이지 전환

**Files:**
- Create: `src/components/sermons/SermonDetail.tsx`
- Create: `src/components/sermons/SermonDetail.test.tsx`
- Modify: `src/app/(site)/sermons/[id]/page.tsx` (전체 교체)
- Delete: `src/app/(site)/sermons/[id]/loading.tsx`

**Interfaces:**
- Consumes: `useSermon`(Task 2), `MemberGate`(Task 1), 기존 `SermonVideo`·`SermonAudio`·`SermonDetailActions`·`MarkdownContent`·`DetailSkeleton`(무수정).
- Produces: `SermonDetail({ id: number })` — 상세 페이지 셸이 소비.

- [ ] **Step 1: 실패하는 테스트 작성** — `src/components/sermons/SermonDetail.test.tsx` (AlbumDetail.test 동형)

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const { useSermonMock } = vi.hoisted(() => ({ useSermonMock: vi.fn() }));
vi.mock("./queries", () => ({ useSermon: useSermonMock }));
vi.mock("./SermonVideo", () => ({ SermonVideo: () => "VIDEO" }));
vi.mock("./SermonAudio", () => ({ SermonAudio: () => "AUDIO" }));
// SermonDetailActions(useRouter·RequirePermission 포함) 무력화 — SermonAdminActions.test에서 검증.
vi.mock("./SermonAdminActions", () => ({ SermonDetailActions: () => null, SermonListAction: () => null }));
vi.mock("@/components/common/MarkdownContent", () => ({
  MarkdownContent: ({ source }: { source: string }) => <div>{source}</div>,
}));

import { SermonDetail } from "./SermonDetail";

function state(over: Record<string, unknown>) {
  return { data: undefined, isPending: false, isError: false, refetch: vi.fn(), ...over };
}
const sermon = {
  id: 7, title: "은혜의 설교", preacher: "김목사", series: "로마서", scripture: "롬 1:1",
  content: "본문 마크다운", videoUrl: "https://youtu.be/x", audioUrl: null,
  preachedAt: "2026-07-19", viewCount: 12, createdAt: "2026-07-19T10:00:00",
  updatedAt: "2026-07-19T10:00:00", version: 0, tags: [{ id: 2, name: "주일" }], author: "관리자",
};

beforeEach(() => useSermonMock.mockReset());

describe("SermonDetail", () => {
  it("로딩 중엔 제목을 렌더하지 않는다", () => {
    useSermonMock.mockReturnValue(state({ isPending: true }));
    render(<SermonDetail id={7} />);
    expect(screen.queryByText("은혜의 설교")).toBeNull();
  });

  it("에러면 다시 시도 버튼을 보인다", () => {
    useSermonMock.mockReturnValue(state({ isError: true }));
    render(<SermonDetail id={7} />);
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeDefined();
  });

  it("성공 시 제목·조회수·태그·본문·영상을 렌더한다", () => {
    useSermonMock.mockReturnValue(state({ data: sermon }));
    render(<SermonDetail id={7} />);
    expect(screen.getByText("은혜의 설교")).toBeDefined();
    expect(screen.getByText("VIDEO")).toBeDefined();
    expect(screen.getByText(/조회 12/)).toBeDefined();
    expect(screen.getByText("주일").closest("a")?.getAttribute("href")).toBe("/sermons?tagId=2");
    expect(screen.getByText("본문 마크다운")).toBeDefined();
  });

  it("videoUrl 없으면 영상 영역이 없다", () => {
    useSermonMock.mockReturnValue(state({ data: { ...sermon, videoUrl: null } }));
    render(<SermonDetail id={7} />);
    expect(screen.queryByText("VIDEO")).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/components/sermons/SermonDetail.test.tsx`
Expected: FAIL — `SermonDetail` 모듈 없음.

- [ ] **Step 3: 구현** — `src/components/sermons/SermonDetail.tsx` (기존 상세 페이지 JSX 이동, 뒤로가기 링크는 셸에 남김)

```tsx
"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { formatDate } from "@/lib/date";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DetailSkeleton } from "@/components/common/DetailSkeleton";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { SermonVideo } from "./SermonVideo";
import { SermonAudio } from "./SermonAudio";
import { SermonDetailActions } from "./SermonAdminActions";
import { useSermon } from "./queries";

// 상세 클라이언트 — 영상 우선 레이아웃(스펙 D6)·클릭 메타로 목록 필터(D9)는 RSC 시절 그대로.
// 조회수+1 부수효과는 fetchSermon GET에 포함(쿼리 캐시 내 재방문은 미증가 — 갤러리와 동일 시맨틱).
export function SermonDetail({ id }: { id: number }) {
  const { data: sermon, isPending, isError, refetch } = useSermon(id);

  if (isPending) {
    return (
      <div className="mt-base">
        <DetailSkeleton />
      </div>
    );
  }
  if (isError || !sermon) {
    return (
      <div className="mt-lg flex flex-col items-start gap-sm">
        <p className={cn(typo.bodyMd, "text-muted")}>설교를 불러오지 못했습니다.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }
  return (
    <>
      {sermon.videoUrl ? (
        <div className="mt-base">
          <SermonVideo url={sermon.videoUrl} title={sermon.title} />
        </div>
      ) : null}

      <h1 className={cn(typo.titleLg, "mt-lg text-ink")}>{sermon.title}</h1>
      <SermonDetailActions id={sermon.id} />

      <p className={cn(typo.datetime, "mt-xs text-muted")}>
        <Link
          href={`/sermons?preacher=${encodeURIComponent(sermon.preacher)}`}
          className="text-primary"
        >
          {sermon.preacher}
        </Link>
        {` · ${formatDate(sermon.preachedAt)} · 조회 ${sermon.viewCount.toLocaleString("ko-KR")}`}
        {sermon.author ? ` · ${sermon.author}` : ""}
      </p>

      {sermon.scripture || sermon.series ? (
        <p className={cn(typo.bodyMd, "mt-xxs text-body")}>
          {sermon.scripture ? <span>{sermon.scripture}</span> : null}
          {sermon.scripture && sermon.series ? " · " : ""}
          {sermon.series ? (
            <Link
              href={`/sermons?series=${encodeURIComponent(sermon.series)}`}
              className="text-primary"
            >
              {sermon.series}
            </Link>
          ) : null}
        </p>
      ) : null}

      {sermon.tags.length > 0 ? (
        <div className="mt-base flex flex-wrap gap-xs">
          {sermon.tags.map((t) => (
            <Link key={t.id} href={`/sermons?tagId=${t.id}`}>
              <Badge>{t.name}</Badge>
            </Link>
          ))}
        </div>
      ) : null}

      {sermon.audioUrl ? (
        <div className="mt-base">
          <SermonAudio url={sermon.audioUrl} />
        </div>
      ) : null}

      <div className="mt-lg border-t border-hairline" />
      <MarkdownContent source={sermon.content} className="mt-lg" />
    </>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/components/sermons/SermonDetail.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: 상세 페이지 셸 교체** — `src/app/(site)/sermons/[id]/page.tsx` 전체를 아래로 교체

```tsx
// src/app/(site)/sermons/[id]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { MemberGate } from "@/components/common/MemberGate";
import { DetailSkeleton } from "@/components/common/DetailSkeleton";
import { SermonDetail } from "@/components/sermons/SermonDetail";

export const metadata: Metadata = { title: "설교" };

// 회원전용 설교 상세(가이드 2.3). RSC는 id 검증만 — 데이터는 SermonDetail이 클라 조회.
export default async function SermonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  return (
    <Container as="section" className="py-section">
      <Link
        href="/sermons"
        className={cn(typo.bodySm, "inline-flex items-center gap-xxs text-primary")}
      >
        <ChevronLeft size={16} aria-hidden />
        설교 목록
      </Link>
      <MemberGate
        permission="SERMON_VIEW"
        domainLabel="설교"
        skeleton={
          <div className="mt-base">
            <DetailSkeleton />
          </div>
        }
      >
        <SermonDetail id={numId} />
      </MemberGate>
    </Container>
  );
}
```

- [ ] **Step 6: loading.tsx 삭제** (사용자 승인됨)

```bash
rm "src/app/(site)/sermons/[id]/loading.tsx"
```

- [ ] **Step 7: 전체 게이트**

Run: `pnpm lint && npx tsc --noEmit && pnpm test`
Expected: 전부 PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat : 설교 상세 회원전용 전환 #N"
```

---

### Task 5: SermonEditLoader + 수정 페이지 전환 + 서버 fetch 제거

**Files:**
- Create: `src/components/sermons/SermonEditLoader.tsx`
- Modify: `src/app/(site)/sermons/[id]/edit/page.tsx` (전체 교체)
- Modify: `src/lib/api/sermons.ts` (`getSermons`·`getSermon` 제거 — 마지막 소비자 소멸)
- Modify: `src/lib/api/sermons.test.ts` (구 `getSermons`·`getSermon` 테스트 제거)

**Interfaces:**
- Consumes: `useSermon`(Task 2), `MemberGate`(Task 1), 기존 `SermonForm`·`RequirePermission`·`EditAccessDenied`(무수정).
- Produces: `SermonEditLoader({ id: number })`. `sermons.ts` 최종 export: `SermonListParams`·`buildSermonQuery`·`fetchSermons`·`fetchSermon`·admin 타입 re-export.

- [ ] **Step 1: SermonEditLoader 구현** — `src/components/sermons/SermonEditLoader.tsx` (AlbumEditLoader 동형이라 별도 신규 테스트 없음 — AlbumEditLoader 관례. 동작은 Task 7 전체 게이트와 기존 SermonForm.test가 커버)

```tsx
// src/components/sermons/SermonEditLoader.tsx
"use client";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { useSermon } from "./queries";
import { SermonForm } from "./SermonForm";

// edit 시드 — 회원 전용(authFetch, 토큰은 클라에만)이라 RSC fetch 불가, 클라 쿼리로 최신 version을 시드.
// keyed 마운트로 defaultValues를 고정한다(effect reset 금지 — set-state-in-effect lint 관례).
export function SermonEditLoader({ id }: { id: number }) {
  const sermon = useSermon(id);
  if (sermon.isPending) {
    return <p className={cn(typo.bodySm, "text-muted")}>불러오는 중…</p>;
  }
  if (sermon.isError || !sermon.data) {
    return <p className={cn(typo.bodySm, "text-error")}>설교를 불러오지 못했습니다.</p>;
  }
  return <SermonForm key={sermon.data.id} mode="edit" initial={sermon.data} />;
}
```

- [ ] **Step 2: 수정 페이지 셸 교체** — `src/app/(site)/sermons/[id]/edit/page.tsx` 전체를 아래로 교체

```tsx
import { notFound } from "next/navigation";
import { Container } from "@/components/shell/Container";
import { MemberGate } from "@/components/common/MemberGate";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { SermonEditLoader } from "@/components/sermons/SermonEditLoader";

export default async function SermonEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 비숫자·0·음수 id는 렌더 전에 차단 — 상세 라우트와 동일 패턴
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">설교 수정</h1>
      <MemberGate permission="SERMON_VIEW" domainLabel="설교">
        <RequirePermission permission="SERMON_WRITE" fallback={<EditAccessDenied />}>
          <SermonEditLoader id={numId} />
        </RequirePermission>
      </MemberGate>
    </Container>
  );
}
```

- [ ] **Step 3: 서버 fetch 제거** — `src/lib/api/sermons.ts`에서 `getSermons`·`getSermon` 함수와 `import { apiUrl }` 라인을 삭제하고, 파일 상단 주석을 갱신한다. **최종 파일 전체:**

```ts
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import type { Page } from "@/lib/page";
import type { SermonCardResponse, SermonDetailResponse } from "./types";

// 설교 조회는 회원전용(SERMON_VIEW, 가이드 2.3) — authFetch를 쓰므로 클라이언트 전용 모듈.
// 서버 컴포넌트에서 import 금지(authFetch·authStore 체인이 서버 번들에 포함되어 오류).

// 설교 목록 필터(가이드 10장). 공유 buildListQuery는 q/preacher/series/from/to를 안 다루므로 전용 빌더.
export interface SermonListParams {
  page?: number;
  size?: number;
  sort?: string; // 미지정 시 백엔드 기본 preachedAt,desc
  tagId?: number;
  q?: string;
  preacher?: string;
  series?: string;
  from?: string; // yyyy-MM-dd
  to?: string;
}

export function buildSermonQuery(p: SermonListParams): string {
  const sp = new URLSearchParams();
  if (p.page != null) sp.set("page", String(p.page));
  if (p.size != null) sp.set("size", String(p.size));
  if (p.sort) sp.set("sort", p.sort);
  if (p.tagId != null) sp.set("tagId", String(p.tagId));
  if (p.q) sp.set("q", p.q);
  if (p.preacher) sp.set("preacher", p.preacher);
  if (p.series) sp.set("series", p.series);
  if (p.from) sp.set("from", p.from);
  if (p.to) sp.set("to", p.to);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// 목록(회원전용). /api/sermons는 토큰 필요 → authFetch.
export async function fetchSermons(
  p: SermonListParams = {},
): Promise<Page<SermonCardResponse>> {
  const res = await authFetch(`/api/sermons${buildSermonQuery(p)}`);
  return parseJson<Page<SermonCardResponse>>(res);
}

// 상세(회원전용). GET마다 조회수+1(부수효과). 404 특수 처리 없음 — 클라에서 에러 안내(갤러리 관례).
export async function fetchSermon(id: number): Promise<SermonDetailResponse> {
  const res = await authFetch(`/api/sermons/${id}`);
  return parseJson<SermonDetailResponse>(res);
}

// 어드민 쓰기(createSermon·updateSermon·patchSermon·deleteSermon + 타입)는 sermons.admin.ts에서 제공.
export type {
  SermonCreateRequest,
  SermonUpdateRequest,
  SermonPatchRequest,
} from "./sermons.admin";
```

- [ ] **Step 4: 구 테스트 제거** — `src/lib/api/sermons.test.ts`에서 `describe("getSermons", ...)`·`describe("getSermon", ...)` 블록, import의 `getSermons, getSermon`, `okResponse` 헬퍼, `afterEach(() => vi.unstubAllGlobals())` 라인을 삭제한다(전역 fetch stub이 사라지므로). `buildSermonQuery`·`fetchSermons`·`fetchSermon` 테스트는 유지.

- [ ] **Step 5: 전체 게이트**

Run: `pnpm lint && npx tsc --noEmit && pnpm test`
Expected: 전부 PASS — `getSermon` 잔존 참조가 있으면 tsc가 잡는다.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat : 설교 수정 페이지 클라 시드 전환·서버 fetch 제거 #N"
```

---

### Task 6: 설교 쓰기 무효화 — ISR 태그 → TanStack Query

**Files:**
- Modify: `src/components/sermons/SermonForm.tsx`
- Modify: `src/components/sermons/SermonForm.test.tsx`
- Modify: `src/components/sermons/SermonAdminActions.tsx`
- Modify: `src/components/sermons/SermonAdminActions.test.tsx`
- Modify: `src/lib/admin/revalidate.ts` (`revalidateSermons` 제거)
- Modify: `src/lib/admin/revalidate.test.ts`

**Interfaces:**
- Consumes: Task 2의 쿼리 키 규약 — 목록 `["sermons", params]`(prefix `["sermons"]` 무효화), 상세 `["sermon", id]`.

- [ ] **Step 1: 실패하는 테스트로 갱신** — `src/components/sermons/SermonForm.test.tsx`

hoisted에서 `revalidateSermonsMock` 제거, `vi.mock("@/lib/admin/revalidate", ...)` 라인 삭제.
"등록 성공" 테스트를 invalidate 검증으로 교체:

```tsx
  it("등록 성공 시 쿼리 무효화 후 상세로 이동한다", async () => {
    createSermonMock.mockResolvedValue({ id: 9 });
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    renderForm(<SermonForm mode="create" />);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "주일설교" } });
    fireEvent.change(screen.getByLabelText("설교자"), { target: { value: "김목사" } });
    fireEvent.change(screen.getByLabelText("설교일"), { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(createSermonMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "주일설교", preacher: "김목사", preachedAt: "2026-06-01" }),
      ),
    );
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sermons"] }));
    expect(pushMock).toHaveBeenCalledWith("/sermons/9");
    expect(notifySuccess).toHaveBeenCalled();
  });
```

"수정 모드" 테스트에 상세 무효화 검증 추가(기존 assertion 아래):

```tsx
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
```
(render 전에 선언) 및 마지막에:
```tsx
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sermon", 9] }));
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/components/sermons/SermonForm.test.tsx`
Expected: FAIL — 아직 revalidateSermons를 import·호출 중(mock 제거로 모듈 실 로드 → server action import 에러 또는 invalidate 미호출 assertion 실패).

- [ ] **Step 3: SermonForm 구현 수정** — `src/components/sermons/SermonForm.tsx`

import 교체:

```ts
// 삭제
import { revalidateSermons } from "@/lib/admin/revalidate";
// useMutation import를 확장
import { useMutation, useQueryClient } from "@tanstack/react-query";
```

컴포넌트 상단(`const router = useRouter();` 아래)에 추가:

```ts
  const qc = useQueryClient();
```

`SAVED_NOTICE` 주석 교체:

```ts
// 쓰기 직후 쿼리 무효화로 목록·상세가 즉시 갱신되므로 지연 안내 불필요.
const SAVED_NOTICE = "저장했습니다.";
```

mutation의 onError `onReedit`·onSuccess 교체:

```ts
    onError: adminOnError({
      onFieldErrors: (fes) =>
        fes.forEach((fe) =>
          setError(fe.field as keyof SermonFormValues, { message: fe.reason }),
        ),
      // 409 재편집: 상세 쿼리 무효화 → SermonEditLoader가 최신 version으로 다시 시드한다(AlbumForm 관례).
      onReedit: () => qc.invalidateQueries({ queryKey: initial ? ["sermon", initial.id] : ["sermons"] }),
    }),
    onSuccess: (res) => {
      // 쓰기 성공 즉시 회원 쿼리 캐시 무효화 → 목록·상세가 fresh 데이터를 받음(ISR 태그 아님 — 회원전용 전환).
      qc.invalidateQueries({ queryKey: ["sermons"] });
      if (mode === "edit" && initial) qc.invalidateQueries({ queryKey: ["sermon", initial.id] });
      notify.success(SAVED_NOTICE);
      router.push(`/sermons/${res.id}`);
    },
```

(`useRouter`는 유지 — `router.back()`·`router.push` 사용 중. `refresh`는 더 이상 안 씀.)

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/components/sermons/SermonForm.test.tsx`
Expected: PASS

- [ ] **Step 5: SermonAdminActions 테스트 갱신 → 실패 확인 → 구현**

`src/components/sermons/SermonAdminActions.test.tsx`: hoisted에서 `revalidateSermonsMock` 제거,
`vi.mock("@/lib/admin/revalidate", ...)` 라인 삭제. 삭제 테스트 교체:

```tsx
  it("삭제 확정 시 쿼리 무효화 후 목록으로 이동한다", async () => {
    useMeMock.mockReturnValue({ data: { permissions: ["SERMON_WRITE"] }, isLoading: false });
    deleteSermonMock.mockResolvedValue(undefined);
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    renderWithQc(<SermonDetailActions id={9} />);
    // 행 트리거는 aria-label="설교 삭제"로 찾고, 확정 다이얼로그 버튼은 라벨 "삭제"로 찾는다.
    fireEvent.click(screen.getByRole("button", { name: "설교 삭제" }));
    const confirmButtons = screen.getAllByRole("button", { name: "삭제" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    await waitFor(() => expect(deleteSermonMock).toHaveBeenCalledWith(9));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sermons"] }));
    expect(pushMock).toHaveBeenCalledWith("/sermons");
  });
```

Run: `pnpm test src/components/sermons/SermonAdminActions.test.tsx` → FAIL 확인 후,
`src/components/sermons/SermonAdminActions.tsx` 수정:

```ts
// import 교체
import { useMutation, useQueryClient } from "@tanstack/react-query";
// 삭제: import { revalidateSermons } from "@/lib/admin/revalidate";
```

`SermonDetailActions` 내부(`const router = useRouter();` 아래) 추가 및 onSuccess 교체:

```ts
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: () => deleteSermon(id),
    onError: adminOnError(),
    onSuccess: () => {
      // 삭제 즉시 회원 쿼리 캐시 무효화 → 목록이 fresh 데이터를 받음.
      qc.invalidateQueries({ queryKey: ["sermons"] });
      notify.success("삭제했습니다.");
      setOpen(false);
      router.push("/sermons");
    },
  });
```

Run: `pnpm test src/components/sermons/SermonAdminActions.test.tsx` → PASS

- [ ] **Step 6: revalidateSermons 제거** — `src/lib/admin/revalidate.ts`에서 함수 삭제:

```ts
// 삭제할 블록
export async function revalidateSermons() {
  updateTag("sermons");
}
```

`src/lib/admin/revalidate.test.ts`에서 import의 `revalidateSermons`와 해당 `it` 블록 삭제.

- [ ] **Step 7: 전체 게이트**

Run: `pnpm lint && npx tsc --noEmit && pnpm test`
Expected: 전부 PASS — `revalidateSermons` 잔존 참조가 있으면 tsc가 잡는다.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor : 설교 쓰기 무효화 ISR 태그에서 TanStack 쿼리로 전환 #N"
```

---

### Task 7: 가이드 문서 갱신 + 최종 검증

**Files:**
- Modify: `docs/church-frontend-guide.md`

- [ ] **Step 1: 권한 매핑표(2.2)에 행 추가** — `GALLERY_VIEW` 행 바로 아래:

```
| `SERMON_VIEW` | **설교 조회 자체**(회원 전용) | `GET /api/sermons`·`GET /api/sermons/{id}` |
```

- [ ] **Step 2: 경로 인가 3분법(2.3) 표에 행 추가** — `/api/gallery/**` 행 아래:

```
| `GET /api/sermons`·`GET /api/sermons/{id}` | **`SERMON_VIEW` 필요**(회원 전용, 비공개) | 비로그인·`USER`만 보유 사용자는 차단 |
```

- [ ] **Step 3: 차단 UX 문단 갱신** — 기존:

```
**갤러리 회원전용 차단 UX**: 갤러리 진입 시 토큰/`/members/me`에 `GALLERY_VIEW`가 없으면, 호출하지 말고 "교인 승인 후 이용 가능" 안내를 띄운다. 그대로 호출하면 비로그인은 401 `INVALID_TOKEN`, 로그인+권한없음은 403 `ACCESS_DENIED`.
```

교체:

```
**갤러리·설교 회원전용 차단 UX**: 갤러리·설교 진입 시 토큰/`/members/me`에 `GALLERY_VIEW`/`SERMON_VIEW`가 없으면, 호출하지 말고 "교인 승인 후 이용 가능" 안내를 띄운다(공용 `MemberGate`). 그대로 호출하면 비로그인은 401 `INVALID_TOKEN`, 로그인+권한없음은 403 `ACCESS_DENIED`.
```

- [ ] **Step 4: 도메인 표(10장) sermon 행 갱신** — 기존 문자열:

```
| O(create/update/patch) | 조회 공개, 쓰기 `SERMON_WRITE` |
```

교체:

```
| O(create/update/patch) | 조회 `SERMON_VIEW`(회원전용), 쓰기 `SERMON_WRITE` |
```

- [ ] **Step 5: 교인 승인 문구(1장) 갱신** — 기존:

```
3. 관리자가 `MEMBER` 역할을 부여하면(9장 아님, 7장 회원 관리) **교인 승인** 완료 → `GALLERY_VIEW` 획득.
```

교체:

```
3. 관리자가 `MEMBER` 역할을 부여하면(9장 아님, 7장 회원 관리) **교인 승인** 완료 → `GALLERY_VIEW`·`SERMON_VIEW` 획득.
```

- [ ] **Step 6: 최종 전체 검증**

Run: `pnpm lint && npx tsc --noEmit && pnpm test`
Expected: 전부 PASS

Run: `pnpm build`
Expected: 성공 — 설교 페이지가 더 이상 빌드 시 fetch하지 않으므로 백엔드 없이도 통과.
(Task 2~5 중간 상태에서 깨졌던 서버 번들 문제는 Task 5 완료로 해소되어 있어야 한다.)

- [ ] **Step 7: Commit**

```bash
git add docs/church-frontend-guide.md
git commit -m "docs : 가이드 설교 회원전용(SERMON_VIEW) 반영 #N"
```

---

## 수동 검수 (구현 후 dev 서버에서)

백엔드 로컬 기동 상태에서 `pnpm dev`:

1. 비로그인 `/sermons` → "로그인 후 이용 가능합니다" + 로그인 버튼(`?next=/sermons`). API 호출 0회(네트워크 탭).
2. `USER`만 보유 계정 → "교인 승인 후 이용 가능합니다".
3. `MEMBER` 계정 → 목록·검색·태그필터·페이지네이션 정상, 상세 진입 시 조회수 증가.
4. `SERMON_WRITE` 계정 → 등록/수정/삭제 후 목록·상세 즉시 갱신(무효화 동작).
5. 메인 페이지 최신 설교 3 티저는 비로그인에게도 보이고, 클릭 시 1번 흐름.
6. 갤러리 4개 화면(목록·상세·등록·수정) 게이트 회귀 없음.
