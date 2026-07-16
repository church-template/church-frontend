# 공개 페이지 이동 로딩 스켈레톤 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공개 페이지(공지·주보·일정·설교) 이동 시 클릭 즉시 스켈레톤 피드백을 주는 `loading.tsx`를 배치한다.

**Architecture:** 기존 `Skeleton` 프리미티브를 조합한 공용 스켈레톤 3종(`ListRowsSkeleton`·`CardGridSkeleton`·`DetailSkeleton`)을 `src/components/common/`에 만들고, 각 공개 세그먼트의 `loading.tsx`가 실물 페이지와 동일한 Container·그리드 구조로 이를 배치한다(Next App Router 네이티브 Suspense fallback — 링크와 함께 프리페치되어 즉시 표시). 전역 모달·프로그레스 바·캐싱 변경 없음.

**Tech Stack:** Next.js 16.2.9 (App Router `loading.tsx`) · Tailwind v4 토큰 유틸 · vitest + @testing-library/react

**스펙:** `docs/superpowers/specs/2026-07-17-navigation-loading-feedback-design.md` · **이슈:** #95 · **브랜치:** `20260717_#95_공개_페이지_이동_로딩_스켈레톤_추가`

## Global Constraints

- 커밋 메시지: `<type> : <설명> #95` — push 금지, Co-Authored-By 금지, GPG 서명 금지
- 주석은 한국어·WHY 중심. 사용자 노출 텍스트 하드코딩 금지 예외: 페이지 제목("공지"·"주보" 등)은 실물 페이지가 이미 정적 문자열로 렌더하므로 loading.tsx도 동일 문자열 사용
- 텍스트 스타일은 `typo.*` 상수(`@/constants/typography`), 색·간격은 토큰 유틸(`text-ink`·`mt-lg` 등). hex·px·arbitrary value 금지. Tailwind 표준 스케일 유틸(`h-7`·`w-24` 등)은 기존 `Skeleton` 사용 관례대로 허용
- JSX 조건부 렌더링 삼항(`{cond ? <X/> : null}`) — 이번 코드에는 조건부 렌더 없음
- 스켈레톤은 전부 서버 컴포넌트(`"use client"` 없음, 훅 없음), 장식이므로 `aria-hidden`
- 테스트 관례: `import { describe, it, expect } from "vitest"` 명시(globals 없음), jest-dom 없음(`getAttribute`/`className.toContain` 사용)
- 패키지 매니저 pnpm. 테스트 실행: `pnpm test <파일경로>`

---

### Task 1: ListRowsSkeleton (목록 행 스켈레톤)

**Files:**
- Create: `src/components/common/ListRowsSkeleton.tsx`
- Test: `src/components/common/ListRowsSkeleton.test.tsx`

**Interfaces:**
- Consumes: `Skeleton` (`@/components/common/Skeleton`, `{ className?: string }`)
- Produces: `ListRowsSkeleton({ rows?: number })` — 기본 10행. Task 4의 notices/bulletins `loading.tsx`가 사용

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/common/ListRowsSkeleton.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ListRowsSkeleton } from "./ListRowsSkeleton";

describe("ListRowsSkeleton", () => {
  it("rows 수만큼 행을 aria-hidden으로 렌더한다", () => {
    const { container } = render(<ListRowsSkeleton rows={4} />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.children.length).toBe(4);
  });

  it("기본 10행을 렌더한다", () => {
    const { container } = render(<ListRowsSkeleton />);
    expect((container.firstChild as HTMLElement).children.length).toBe(10);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/components/common/ListRowsSkeleton.test.tsx`
Expected: FAIL — `Failed to resolve import "./ListRowsSkeleton"`

- [ ] **Step 3: 최소 구현**

`src/components/common/ListRowsSkeleton.tsx`:

```tsx
import { Skeleton } from "@/components/common/Skeleton";

export interface ListRowsSkeletonProps {
  rows?: number;
}

// 목록 행 로딩 자리표시 — notice-row/bulletin-row 미러(제목+날짜 가로 행, hairline 구분, py-base).
// 실물과 같은 행 높이라 콘텐츠 교체 시 레이아웃 점프가 없다.
export function ListRowsSkeleton({ rows = 10 }: ListRowsSkeletonProps) {
  return (
    <div aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-base border-b border-hairline py-base"
        >
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-5 w-24 shrink-0" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/components/common/ListRowsSkeleton.test.tsx`
Expected: PASS (2 tests)

---

### Task 2: CardGridSkeleton (카드 그리드 스켈레톤)

**Files:**
- Create: `src/components/common/CardGridSkeleton.tsx`
- Test: `src/components/common/CardGridSkeleton.test.tsx`

**Interfaces:**
- Consumes: `Skeleton` · `Card` (`@/components/ui/Card`, `bordered?: boolean` — div attrs 스프레드)
- Produces: `CardGridSkeleton({ count?: number })` — 기본 6개, 그리드 `grid gap-base sm:grid-cols-2 lg:grid-cols-3`(설교 목록과 동일). Task 4의 sermons `loading.tsx`가 사용

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/common/CardGridSkeleton.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CardGridSkeleton } from "./CardGridSkeleton";

describe("CardGridSkeleton", () => {
  it("count 수만큼 카드꼴을 반응형 그리드로 aria-hidden 렌더한다", () => {
    const { container } = render(<CardGridSkeleton count={3} />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.className).toContain("sm:grid-cols-2");
    expect(root.className).toContain("lg:grid-cols-3");
    expect(root.children.length).toBe(3);
  });

  it("기본 6개를 렌더한다", () => {
    const { container } = render(<CardGridSkeleton />);
    expect((container.firstChild as HTMLElement).children.length).toBe(6);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/components/common/CardGridSkeleton.test.tsx`
Expected: FAIL — `Failed to resolve import "./CardGridSkeleton"`

- [ ] **Step 3: 최소 구현**

`src/components/common/CardGridSkeleton.tsx`:

```tsx
import { Skeleton } from "@/components/common/Skeleton";
import { Card } from "@/components/ui/Card";

export interface CardGridSkeletonProps {
  count?: number;
}

// 카드 그리드 로딩 자리표시 — sermon-card 미러(16:9 썸네일 + 제목/메타 2줄).
// 그리드 클래스는 설교 목록과 동일(모바일 1-up/태블릿 2-up/데스크톱 3-up) — 반응형 자동 일치.
export function CardGridSkeleton({ count = 6 }: CardGridSkeletonProps) {
  return (
    <div aria-hidden className="grid gap-base sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} bordered>
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="flex flex-col gap-xs p-xl">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/components/common/CardGridSkeleton.test.tsx`
Expected: PASS (2 tests)

---

### Task 3: DetailSkeleton (상세 본문 스켈레톤) + 공용 컴포넌트 커밋

**Files:**
- Create: `src/components/common/DetailSkeleton.tsx`
- Test: `src/components/common/DetailSkeleton.test.tsx`

**Interfaces:**
- Consumes: `Skeleton`
- Produces: `DetailSkeleton()` (props 없음) — 뒤로가기 줄 + 제목(titleLg 높이 근사 h-9) + 메타 + hairline 구분선 + 본문 문단 줄. Task 4의 상세 `loading.tsx` 3곳이 사용

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/common/DetailSkeleton.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DetailSkeleton } from "./DetailSkeleton";

describe("DetailSkeleton", () => {
  it("제목·메타·본문 자리표시를 aria-hidden으로 렌더한다", () => {
    const { container } = render(<DetailSkeleton />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(3);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/components/common/DetailSkeleton.test.tsx`
Expected: FAIL — `Failed to resolve import "./DetailSkeleton"`

- [ ] **Step 3: 최소 구현**

`src/components/common/DetailSkeleton.tsx`:

```tsx
import { Skeleton } from "@/components/common/Skeleton";

// 상세 본문 로딩 자리표시 — 공지/설교/일정 상세 공통(뒤로가기 줄 + 제목 + 메타 + 구분선 + 본문 문단).
// 제목 h-9 ≈ titleLg(30px) 줄높이 근사 — 교체 시 점프 최소화.
export function DetailSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-5 w-20" />
      <Skeleton className="mt-lg h-9 w-3/4" />
      <Skeleton className="mt-xs h-5 w-40" />
      <div className="mt-lg border-t border-hairline" />
      <div className="mt-lg flex flex-col gap-xs">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-5 w-2/3" />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/components/common/DetailSkeleton.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: 공용 컴포넌트 3종 + 테스트 커밋**

```bash
git add src/components/common/ListRowsSkeleton.tsx src/components/common/ListRowsSkeleton.test.tsx \
  src/components/common/CardGridSkeleton.tsx src/components/common/CardGridSkeleton.test.tsx \
  src/components/common/DetailSkeleton.tsx src/components/common/DetailSkeleton.test.tsx
git commit -m "feat : 로딩 스켈레톤 공용 컴포넌트 3종 추가 #95"
```

---

### Task 4: 공개 세그먼트 loading.tsx 7개 배치 + 커밋

**Files:**
- Create: `src/app/(site)/notices/loading.tsx`
- Create: `src/app/(site)/notices/[id]/loading.tsx`
- Create: `src/app/(site)/bulletins/loading.tsx`
- Create: `src/app/(site)/events/loading.tsx`
- Create: `src/app/(site)/events/[id]/loading.tsx`
- Create: `src/app/(site)/sermons/loading.tsx`
- Create: `src/app/(site)/sermons/[id]/loading.tsx`

**Interfaces:**
- Consumes: Task 1~3의 `ListRowsSkeleton`·`CardGridSkeleton`·`DetailSkeleton` + 기존 `Container`·`Skeleton`·`typo`·`cn`
- Produces: 각 파일 `export default function Loading()` (Next 파일 컨벤션 — 파라미터 없음, 서버 컴포넌트)

공통 규칙: 실물 페이지의 최상단 구조(`Container as="section" className="py-section"` + h1)를 그대로 미러. 제목은 정적 문자열이라 스켈레톤 대신 실제 텍스트를 즉시 보여준다(loading.md의 "미래 화면의 의미 있는 일부"). 스크린리더용 `role="status"` sr-only 안내 1줄(스켈레톤은 aria-hidden이라 이것이 유일한 낭독 신호).

- [ ] **Step 1: 목록 4개 작성**

`src/app/(site)/notices/loading.tsx`:

```tsx
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/common/Skeleton";
import { ListRowsSkeleton } from "@/components/common/ListRowsSkeleton";

// 공지 목록 로딩 — 실물 페이지와 동일 골격(제목 즉시 표시 + 검색/필터 자리 + 행 목록).
export default function Loading() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>공지</h1>
      <p role="status" className="sr-only">
        페이지를 불러오는 중입니다
      </p>
      <div aria-hidden className="mt-lg flex flex-col gap-base">
        <Skeleton className="h-12 w-full rounded-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
      <div className="mt-xl">
        <ListRowsSkeleton />
      </div>
    </Container>
  );
}
```

`src/app/(site)/bulletins/loading.tsx`:

```tsx
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { ListRowsSkeleton } from "@/components/common/ListRowsSkeleton";

// 주보 목록 로딩 — 실물 페이지와 동일 골격(제목 즉시 표시 + 행 목록).
export default function Loading() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>주보</h1>
      <p role="status" className="sr-only">
        페이지를 불러오는 중입니다
      </p>
      <div className="mt-xl">
        <ListRowsSkeleton />
      </div>
    </Container>
  );
}
```

`src/app/(site)/events/loading.tsx`:

```tsx
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/common/Skeleton";

// 일정 로딩 — 실물 페이지와 동일 골격(제목 즉시 표시 + 필터 자리 + 캘린더 블록 근사).
export default function Loading() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>일정</h1>
      <p role="status" className="sr-only">
        페이지를 불러오는 중입니다
      </p>
      <div aria-hidden className="mt-lg">
        <Skeleton className="h-8 w-2/3" />
      </div>
      <div aria-hidden className="mt-lg">
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </Container>
  );
}
```

`src/app/(site)/sermons/loading.tsx`:

```tsx
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/common/Skeleton";
import { CardGridSkeleton } from "@/components/common/CardGridSkeleton";

// 설교 목록 로딩 — 실물 페이지와 동일 골격(제목 즉시 표시 + 검색/필터 자리 + 카드 그리드).
export default function Loading() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>설교</h1>
      <p role="status" className="sr-only">
        페이지를 불러오는 중입니다
      </p>
      <div aria-hidden className="mt-lg flex flex-col gap-base">
        <Skeleton className="h-12 w-full rounded-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
      <div className="mt-xl">
        <CardGridSkeleton />
      </div>
    </Container>
  );
}
```

- [ ] **Step 2: 상세 3개 작성 (동일 내용)**

`src/app/(site)/notices/[id]/loading.tsx` · `src/app/(site)/events/[id]/loading.tsx` · `src/app/(site)/sermons/[id]/loading.tsx` — 세 파일 모두 아래 동일 내용:

```tsx
import { Container } from "@/components/shell/Container";
import { DetailSkeleton } from "@/components/common/DetailSkeleton";

// 상세 로딩 — 공통 상세 골격(뒤로가기 + 제목 + 메타 + 본문 자리).
export default function Loading() {
  return (
    <Container as="section" className="py-section">
      <p role="status" className="sr-only">
        페이지를 불러오는 중입니다
      </p>
      <DetailSkeleton />
    </Container>
  );
}
```

- [ ] **Step 3: 타입·린트 확인**

Run: `npx tsc --noEmit && pnpm lint`
Expected: 에러 0 (lint는 타입체크를 안 하므로 tsc 별도 실행 — 프로젝트 관례)

- [ ] **Step 4: 커밋**

```bash
git add "src/app/(site)/notices/loading.tsx" "src/app/(site)/notices/[id]/loading.tsx" \
  "src/app/(site)/bulletins/loading.tsx" "src/app/(site)/events/loading.tsx" \
  "src/app/(site)/events/[id]/loading.tsx" "src/app/(site)/sermons/loading.tsx" \
  "src/app/(site)/sermons/[id]/loading.tsx"
git commit -m "feat : 공개 페이지 이동 loading.tsx 스켈레톤 배치 #95"
```

---

### Task 5: 전체 검증 + 커맨드 파일 커밋

**Files:**
- Modify: 없음 (검증만)
- Commit: `.claude/commands/issue-branch.md` (앞서 생성됨, 미커밋 상태)

- [ ] **Step 1: 전체 테스트**

Run: `pnpm test`
Expected: 전체 PASS (기존 테스트 회귀 없음 + 신규 5 tests)

- [ ] **Step 2: 프로덕션 빌드**

Run: `pnpm build`
Expected: 빌드 성공. 출력 라우트 목록에서 notices·bulletins·events·sermons 세그먼트 정상 포함 확인

- [ ] **Step 3: 커맨드 파일 커밋**

```bash
git add .claude/commands/issue-branch.md
git commit -m "chore : issue-branch 커맨드 추가 (이슈 등록 + 작업 브랜치 생성) #95"
```

- [ ] **Step 4: 수동 검증 안내 출력 (사용자 수행)**

구현 후 사용자에게 안내할 체크리스트 (스펙 6장):

1. `pnpm dev` → DevTools Network "Slow 3G" → 공지·주보·설교·일정 이동 시 클릭 즉시 스켈레톤 표시 확인
2. 모바일 폭(375px)에서 설교 스켈레톤 그리드 1-up 확인
3. 페이지네이션·태그 필터 클릭(searchParams 변경) 시 fallback 표시 여부 확인 — 안 뜨면 별도 이슈로 분리
4. 스켈레톤 → 실제 콘텐츠 교체 시 레이아웃 점프 없음 확인
