# 차량 탑승 카드 가시성 개선 + 마이페이지 내 탑승 조회 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회원 차량 탑승 카드를 헤더 + "내 신청" 라벨 블록으로 재구성해 가독성을 높이고, 마이페이지에 "내 차량 탑승"(다가오는 내 신청) 섹션을 추가한다.

**Architecture:** 순수 프론트 변경(백엔드 무관). 카드는 `VehicleRunList`의 카드 마크업만 재구성. 마이페이지 섹션은 기존 회원 목록 훅 `useVehicleRuns`를 재사용해 `myRequest≠null`만 필터(별도 API 없음), `MyChallengeHistory`와 동형 컴포넌트로 구현.

**Tech Stack:** Next.js(App Router)·TanStack Query·Tailwind 토큰·vitest.

**스펙:** `docs/superpowers/specs/2026-07-22-vehicle-card-mypage-design.md`

## Global Constraints

- 주석은 한국어·WHY 중심. hex·px 인라인 금지(`typo.*`·토큰 유틸만). JSX 조건부는 삼항(`{cond ? <X/> : null}`).
- UI 이모지 금지, 아이콘은 lucide-react만. 외부 링크는 `target="_blank" rel="noopener noreferrer"`.
- 라벨 행은 기존 선례 그대로: `<dt className={cn(typo.caption, "w-20 shrink-0 text-muted")}>` (InquiryDetailDialog·ProfileCard 결).
- 지도 링크 텍스트는 "지도 보기"로 통일(기사 명단과 일치) — 카드의 기존 "위치 보기"를 교체.
- 테스트 관례: vitest `globals:false` 명시 import · jest-dom 없음(`toBeDefined()`/`getAttribute`) · `next/navigation`·`next/link` mock · Reveal 쓰는 컴포넌트 테스트는 `matchMedia` 스텁.
- 검증 3종: `pnpm test` · `npx tsc --noEmit` · `pnpm lint`.
- 커밋 형식 `<type> : <설명> #114`. Co-Authored-By 금지. 브랜치 `20260721_#114_차량운행_탑승_신청_웹_적용` 연장(사용자 지시).

---

### Task 1: 차량 탑승 카드 재구성

**Files:**
- Modify: `src/components/vehicles/VehicleRunList.tsx` (카드 마크업만)
- Modify: `src/components/vehicles/VehicleRunList.test.tsx` (단언 갱신)

**Interfaces:**
- Consumes: 기존 `useVehicleRuns`·`useCancelVehicleRequest`·`kakaoMapPinUrl`·`Badge`·`Button`·`DeleteConfirmDialog` (변경 없음).
- Produces: 동일 `VehicleRunList()` (표시 구조만 변경).

- [ ] **Step 1: 테스트 갱신** — `src/components/vehicles/VehicleRunList.test.tsx`의 아래 3개 `it`을 교체(나머지 `it`·상단 mock/fixture는 그대로 유지)

"신청됨 카드엔 배지·내 픽업 장소·취소 버튼" 교체:
```tsx
  it("신청됨 카드엔 배지·라벨 픽업 장소·메모·취소 버튼", async () => {
    fetchMock.mockResolvedValue(page([applied]));
    renderList();
    expect(await screen.findByText("신청됨")).toBeDefined();
    expect(screen.getByText("픽업 장소")).toBeDefined();
    expect(screen.getByText("정문")).toBeDefined();
    expect(screen.getByText("2명")).toBeDefined();
    expect(screen.getByRole("button", { name: "신청 취소" })).toBeDefined();
  });
```

"좌표 있는 신청은 '위치 보기' 링크(카카오맵)" 교체:
```tsx
  it("좌표 있는 신청은 '지도 보기' 링크(카카오맵)", async () => {
    fetchMock.mockResolvedValue(
      page([{ id: 7, departsAt: "2026-08-09T07:30:00", myRequest: { pickupLocation: "정문", latitude: 37.5, longitude: 127.0 } }]),
    );
    renderList();
    const link = await screen.findByRole("link", { name: "지도 보기" });
    expect(link.getAttribute("href")).toBe("https://map.kakao.com/link/map/%EC%A0%95%EB%AC%B8,37.5,127");
  });
```

"좌표만 있고 픽업 텍스트 없으면 '위치 첨부됨' 표기" 교체:
```tsx
  it("좌표만 있고 픽업 텍스트 없으면 '위치 첨부됨' 표기", async () => {
    fetchMock.mockResolvedValue(
      page([{ id: 8, departsAt: "2026-08-16T07:30:00", myRequest: { latitude: 37.5, longitude: 127.0 } }]),
    );
    renderList();
    expect(await screen.findByText("위치 첨부됨")).toBeDefined();
    expect(screen.getByRole("link", { name: "지도 보기" })).toBeDefined();
  });
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/components/vehicles/VehicleRunList.test.tsx`
Expected: FAIL — "픽업 장소"/"정문"/"2명" 미발견, "지도 보기" 링크 없음(현재 "위치 보기")

- [ ] **Step 3: 카드 마크업 교체** — `src/components/vehicles/VehicleRunList.tsx`의 `runs.map(...)` 블록(현재 47~80행 `<section>...</section>`)을 다음으로 교체:

```tsx
      {runs.map((run) => (
        <section key={run.id} className="rounded-xl bg-surface-soft p-xl">
          {/* 헤더: 운행 정보(좌) + 상태 배지(우) */}
          <div className="flex flex-wrap items-start justify-between gap-base">
            <div className="flex flex-col gap-xxs">
              <p className={cn(typo.datetimeLg, "text-ink")}>{departLabel(run)} 출발</p>
              {run.note ? <p className={cn(typo.bodySm, "text-muted")}>{run.note}</p> : null}
            </div>
            {run.myRequest ? <Badge variant="primary">신청됨</Badge> : null}
          </div>

          {run.myRequest ? (
            // 내 신청: 헤어라인으로 운행 정보와 구분 + 좌측 정렬 라벨/값(한글 가독성)
            <div className="mt-md border-t border-hairline pt-md">
              <dl className="flex flex-col gap-sm">
                <div className="flex gap-md">
                  <dt className={cn(typo.caption, "w-20 shrink-0 text-muted")}>픽업 장소</dt>
                  <dd className={cn(typo.bodySm, "text-body")}>
                    {run.myRequest.pickupLocation ? run.myRequest.pickupLocation : "위치 첨부됨"}
                  </dd>
                </div>
                {run.myRequest.note ? (
                  <div className="flex gap-md">
                    <dt className={cn(typo.caption, "w-20 shrink-0 text-muted")}>메모</dt>
                    <dd className={cn(typo.bodySm, "text-body")}>{run.myRequest.note}</dd>
                  </div>
                ) : null}
                {run.myRequest.latitude != null && run.myRequest.longitude != null ? (
                  <div className="flex gap-md">
                    <dt className={cn(typo.caption, "w-20 shrink-0 text-muted")}>위치</dt>
                    <dd>
                      <a
                        href={kakaoMapPinUrl(run.myRequest.latitude, run.myRequest.longitude, run.myRequest.pickupLocation)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(typo.bodySm, "text-primary underline-offset-4 hover:underline")}
                      >
                        지도 보기
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-md flex justify-end">
                <Button type="button" variant="tertiary" onClick={() => setCancelTarget(run)}>신청 취소</Button>
              </div>
            </div>
          ) : (
            <div className="mt-md flex justify-end">
              <Button type="button" variant="primary" onClick={() => setApplyTarget(run)}>탑승 신청</Button>
            </div>
          )}
        </section>
      ))}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/components/vehicles/VehicleRunList.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/components/vehicles/VehicleRunList.tsx src/components/vehicles/VehicleRunList.test.tsx
git commit -m "feat : 차량 탑승 카드 헤더·내 신청 블록으로 가독성 개선 #114"
```

---

### Task 2: 마이페이지 "내 차량 탑승" 섹션

**Files:**
- Modify: `src/components/vehicles/queries.ts` (`useVehicleRuns`에 `enabled` 파라미터)
- Create: `src/components/mypage/MyVehicleBoardings.tsx`, `src/components/mypage/MyVehicleBoardings.test.tsx`
- Modify: `src/components/mypage/MypageContent.tsx` (섹션 배치)
- Modify: `src/components/mypage/MypageContent.test.tsx` (자식 mock 추가)

**Interfaces:**
- Consumes: `useVehicleRuns(page, enabled)`, `useHasPermission`(`@/lib/auth/useMe`), `VehicleRunCardResponse`, `Badge`, `Reveal`, `formatDate`/`formatClockTime`.
- Produces: `MyVehicleBoardings({ delay?: number })` · `useVehicleRuns(page: number, enabled?: boolean)`.

- [ ] **Step 1: 훅에 enabled 추가** — `src/components/vehicles/queries.ts`의 `useVehicleRuns`를 교체:

```ts
// 게이트 통과 후에만 마운트. retry:false — 401 재시도는 authFetch 전담(챌린지 컨벤션).
// enabled: 마이페이지는 VehicleGate 밖이라 권한 없으면 호출을 억제(기본 true라 /vehicle-runs 무영향).
export function useVehicleRuns(page: number, enabled = true) {
  return useQuery({
    queryKey: ["vehicle-runs", { page }],
    queryFn: () => fetchVehicleRuns({ page }),
    placeholderData: keepPreviousData,
    enabled,
    retry: false,
  });
}
```

- [ ] **Step 2: 실패하는 테스트 작성** — `src/components/mypage/MyVehicleBoardings.test.tsx` (MyChallengeHistory.test 동형)

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { fetchMock, usePermMock } = vi.hoisted(() => ({ fetchMock: vi.fn(), usePermMock: vi.fn() }));
vi.mock("@/lib/api/vehicles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/vehicles")>()),
  fetchVehicleRuns: fetchMock,
}));
vi.mock("@/lib/auth/useMe", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useHasPermission: usePermMock,
}));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import { MyVehicleBoardings } from "./MyVehicleBoardings";
import type { VehicleRunCardResponse } from "@/lib/api/types";

const page = (content: VehicleRunCardResponse[]) => ({ content, page: { size: 10, number: 0, totalElements: content.length, totalPages: 1 } });
const applied: VehicleRunCardResponse = { id: 6, departsAt: "2026-08-02T07:30:00", myRequest: { pickupLocation: "태산아파트 정문" } };
const unapplied: VehicleRunCardResponse = { id: 7, departsAt: "2026-08-09T07:30:00", myRequest: null };

let qc: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  usePermMock.mockReturnValue(true);
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true }))); // Reveal reduced 경로
});
afterEach(() => vi.unstubAllGlobals());
const renderIt = () => render(<QueryClientProvider client={qc}><MyVehicleBoardings /></QueryClientProvider>);

describe("MyVehicleBoardings", () => {
  it("다가오는 내 신청 행: 출발 시각·픽업·목록 링크", async () => {
    fetchMock.mockResolvedValue(page([applied]));
    renderIt();
    expect(await screen.findByText("픽업: 태산아파트 정문")).toBeDefined();
    expect(screen.getByRole("link", { name: /출발/ }).getAttribute("href")).toBe("/vehicle-runs");
  });

  it("내 신청 없는 운행은 제외 → 0건이면 비노출(null)", async () => {
    fetchMock.mockResolvedValue(page([unapplied]));
    const { container } = renderIt();
    await new Promise((r) => setTimeout(r, 0));
    expect(container.textContent).toBe("");
  });

  it("권한 없으면 조회 자체를 안 함", () => {
    usePermMock.mockReturnValue(false);
    const { container } = renderIt();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toBe("");
  });

  it("좌표만 신청(픽업 텍스트 없음)이면 '위치 첨부됨'", async () => {
    fetchMock.mockResolvedValue(page([{ id: 8, departsAt: "2026-08-16T07:30:00", myRequest: { latitude: 37.5, longitude: 127.0 } }]));
    renderIt();
    expect(await screen.findByText("픽업: 위치 첨부됨")).toBeDefined();
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm vitest run src/components/mypage/MyVehicleBoardings.test.tsx`
Expected: FAIL — `Cannot find module './MyVehicleBoardings'`

- [ ] **Step 4: 구현** — `src/components/mypage/MyVehicleBoardings.tsx`

```tsx
"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatClockTime } from "@/lib/date";
import { useHasPermission } from "@/lib/auth/useMe";
import { useVehicleRuns } from "@/components/vehicles/queries";
import { Reveal } from "@/components/main/Reveal";
import type { VehicleRunCardResponse } from "@/lib/api/types";

// 마이페이지 "내 차량 탑승"(my-challenge-history 동형). 다가오는 운행 중 내 신청만(백엔드 이력 API 없음).
// 권한 미보유·0건이면 섹션째 null. Reveal은 null 체크 뒤 내부에서 감싼다(빈 wrapper가 gap 차지 방지).
export function MyVehicleBoardings({ delay }: { delay?: number }) {
  const canView = useHasPermission("VEHICLE_APPLY");
  const list = useVehicleRuns(0, canView);

  const mine = canView && list.data ? list.data.content.filter((r) => r.myRequest != null) : [];
  if (mine.length === 0) return null;

  const departLabel = (r: VehicleRunCardResponse) => `${formatDate(r.departsAt)} ${formatClockTime(r.departsAt)}`;

  return (
    <Reveal delay={delay}>
      <section className="rounded-xl border border-hairline bg-surface-card p-xl">
        <h2 className={cn(typo.titleSm, "text-ink")}>내 차량 탑승</h2>
        <ul className="mt-md flex flex-col">
          {mine.map((r) => (
            <li key={r.id} className="border-t border-hairline first:border-t-0">
              <Link href="/vehicle-runs" className="flex flex-col gap-xxs py-md hover:text-primary">
                <span className="flex items-center gap-sm">
                  <span className={cn(typo.bodyMd, "font-semibold text-ink")}>{departLabel(r)} 출발</span>
                  <Badge variant="primary">신청됨</Badge>
                </span>
                <span className={cn(typo.bodySm, "text-muted")}>
                  픽업: {r.myRequest?.pickupLocation ?? "위치 첨부됨"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Reveal>
  );
}
```

- [ ] **Step 5: 통과 확인**

Run: `pnpm vitest run src/components/mypage/MyVehicleBoardings.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: 마이페이지 배치** — `src/components/mypage/MypageContent.tsx`

import 추가(기존 `MyChallengeHistory` import 아래):
```tsx
import { MyVehicleBoardings } from "./MyVehicleBoardings";
```
`<MyChallengeHistory delay={150} />`와 `<ManageHub delay={180} />` 사이에 추가:
```tsx
            <MyChallengeHistory delay={150} />
            <MyVehicleBoardings delay={165} />
            <ManageHub delay={180} />
```

- [ ] **Step 7: MypageContent 테스트 자식 mock 추가** — `src/components/mypage/MypageContent.test.tsx`의 `vi.mock("./MyChallengeHistory", ...)` 줄 아래에 추가:

```tsx
vi.mock("./MyVehicleBoardings", () => ({ MyVehicleBoardings: () => <div>MyVehicleBoardings</div> }));
```

- [ ] **Step 8: 통과 확인**

Run: `pnpm vitest run src/components/mypage`
Expected: PASS (MyVehicleBoardings 4 + 기존 mypage 테스트 전부)

- [ ] **Step 9: 커밋**

```bash
git add src/components/vehicles/queries.ts src/components/mypage/MyVehicleBoardings.tsx src/components/mypage/MyVehicleBoardings.test.tsx src/components/mypage/MypageContent.tsx src/components/mypage/MypageContent.test.tsx
git commit -m "feat : 마이페이지에 내 차량 탑승 섹션 추가 #114"
```

---

### Task 3: DESIGN.md 갱신 + 전체 검증

**Files:**
- Modify: `.claude/rules/DESIGN.md`

- [ ] **Step 1: DESIGN.md 갱신** — `vehicle-run-card` 항목의 첫 문장(레이아웃 서술 부분)을 다음 취지로 갱신(기존 위치 첨부 서술은 유지):

`vehicle-run-card` 항목 맨 앞 "schedule-card 변형" 서술에 이어, 오른쪽 정렬 스택이 아니라 **헤더(출발시각·운행메모 좌 / `신청됨` 배지 우) + 1px 헤어라인 + "내 신청" 라벨 행 블록(픽업 장소·메모·위치 = `지도 보기` 링크, `w-20` 라벨/값 좌측정렬) + 하단 우측 `신청 취소`**, 미신청은 헤더 아래 우측 `탑승 신청` 버튼임을 명시. (기존 항목 텍스트를 지우지 말고 레이아웃 서술만 이 구조로 교체.)

"### 마이페이지" 구획에 신규 항목 추가(`manage-hub` 위 또는 아래, 자기 구획 내):
```markdown
- **`my-vehicle-boardings`**: 마이페이지 "내 차량 탑승" 섹션(my-challenge-history 동형). 다가오는 운행일 목록(회원 `useVehicleRuns`)에서 내 신청(`myRequest≠null`)만 필터 — 지난 이력은 백엔드 전용 API가 없어 미표시. 행 = 출발 시각 `{typography.body-md}`(600) + `신청됨` Badge + "픽업: {장소 또는 '위치 첨부됨'}", 1px 헤어라인 구분, 행 전체가 `/vehicle-runs` 링크(취소·관리는 거기서). `VEHICLE_APPLY` 미보유·0건이면 섹션째 비노출(Reveal은 null 체크 뒤 내부 래핑).
```

- [ ] **Step 2: 전체 테스트**

Run: `pnpm test`
Expected: 신규·기존 전부 PASS. 사전존재 실패 4파일(`about/SymbolismList`·`about/VisionHero`·`main/HeroHeaderSync`·`about/photos/page`)은 이 브랜치 미접촉이라 무관 — 그 외 실패 0.

- [ ] **Step 3: 타입 체크·린트**

Run: `npx tsc --noEmit && pnpm lint`
Expected: tsc 0 오류. lint 0 오류(경고는 기존 파일 RHF watch 한정).

- [ ] **Step 4: 커밋**

```bash
git add .claude/rules/DESIGN.md
git commit -m "docs : 차량 탑승 카드·마이페이지 섹션 디자인 갱신 #114"
```

---

## 자기 검토 메모

- 스펙 커버: 카드 재구성(Task 1)·마이페이지 섹션+훅 enabled(Task 2)·DESIGN.md(Task 3)·테스트(각 태스크)·비범위(지난 이력·타 참여유형·상세페이지 없음) 모두 반영.
- 타입 정합: `useVehicleRuns(page, enabled?)` 시그니처가 Task 2에서 정의되고 `/vehicle-runs` 페이지의 기존 `useVehicleRuns(page)` 호출은 기본값으로 무영향. `MyRequestResponse.pickupLocation?`(optional)를 카드·마이페이지 모두 삼항/`??`로 방어.
- "위치 보기"→"지도 보기" 라벨 통일에 따라 Task 1 테스트 2건의 링크 이름 단언을 함께 갱신.
