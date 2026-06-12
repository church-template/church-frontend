# 주보 목록·PDF 열람 (T13) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 주보 목록(`/bulletins`)을 공개 서버 컴포넌트로 구현하고, 행 클릭 시 PDF를 새 탭(브라우저 기본 뷰어)으로 연다.

**Architecture:** 공지(T12)와 동일한 공개 목록 패턴 — 서버 컴포넌트 + `revalidate 60` fetch + 행 목록 + Pagination. 상세 페이지 없음(행 클릭 = `GET /api/media/{mediaId}` 새 탭 직행). 쿼리 빌더는 공용 `buildListQuery` 재사용.

**Tech Stack:** Next.js App Router(서버 컴포넌트), TypeScript, Tailwind(토큰), vitest + @testing-library/react

**스펙:** `docs/superpowers/specs/2026-06-12-bulletins-design.md`
**브랜치:** `20260610_#14_주보_목록_PDF_열람` (생성됨) · 커밋 이슈 번호 **#14**

---

## 파일 구조 (File Structure)

```
Create:
  src/lib/api/bulletins.ts                    — 주보 목록 fetch (buildListQuery 재사용)
  src/lib/api/bulletins.test.ts
  src/components/cards/BulletinRow.tsx        — 새 탭 PDF anchor 행 (notice-row 변형)
  src/components/cards/BulletinRow.test.tsx
  src/app/(site)/bulletins/page.tsx           — /bulletins 목록 페이지
  src/app/(site)/bulletins/page.test.tsx
Modify:
  src/lib/api/types.ts                        — BulletinCardResponse 추가 (끝에)
  .claude/rules/DESIGN.md                     — 콘텐츠 카드 절에 bulletin-row 항목 추가
```

변경하지 않는 것: `navigation.ts`(GNB `/bulletins` 링크 기존재), `lib/page.ts`(buildListQuery 그대로 사용), NoticeRow(공지 코드 무변경 — 설계 D4), `markdown.ts`(상대경로 이슈는 범위 밖 — 스펙 §8).

---

## Task 1: DESIGN.md에 `bulletin-row` 정의 추가

문서에 없는 컴포넌트는 구현하지 않는다는 프로젝트 규칙에 따라 **구현보다 먼저** 추가한다.

**Files:**
- Modify: `.claude/rules/DESIGN.md` — `### 콘텐츠 카드` 절의 `notice-row` 항목 바로 아래

- [ ] **Step 1: 항목 추가**

`notice-row` 불릿(`- **\`notice-row\`**: 제목 + 날짜의 가로 행, 1px 헤어라인 구분. 클릭 영역은 행 전체.`) 바로 아래에 삽입:

```markdown
- **`bulletin-row`**: 주보 행(notice-row 변형). 제목 `{typography.title-sm}` + 예배일
  `{typography.datetime}` `{colors.muted}` + 작성자 `{typography.body-sm}` `{colors.muted}`(없으면 줄 생략).
  행 전체가 새 탭 PDF 링크(`GET /api/media/{id}`), 1px 헤어라인 구분, hover 시 제목 primary 전이.
```

- [ ] **Step 2: 커밋**

```bash
git add .claude/rules/DESIGN.md
git commit -m "docs: DESIGN.md bulletin-row 컴포넌트 정의 #14"
```

---

## Task 2: 타입 + API 레이어 (`bulletins.ts`)

**Files:**
- Modify: `src/lib/api/types.ts` (파일 끝에 추가)
- Create: `src/lib/api/bulletins.ts`
- Test: `src/lib/api/bulletins.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성** — `src/lib/api/bulletins.test.ts`

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { getBulletins } from "./bulletins";

afterEach(() => vi.unstubAllGlobals());

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

// buildListQuery 자체는 page.test.ts가 커버 — 여기선 호출 URL·옵션·에러만 검증.
describe("getBulletins", () => {
  it("'/api/bulletins'+쿼리를 revalidate 60으로 호출", async () => {
    const spy = vi.fn(async () => okResponse({ content: [], page: {} }));
    vi.stubGlobal("fetch", spy);
    await getBulletins({ page: 2 });
    expect(spy).toHaveBeenCalledWith("/api/bulletins?page=2", {
      next: { revalidate: 60 },
    });
  });

  it("파라미터 생략 시 쿼리 없이 호출(서버 기본 serviceDate,desc 신뢰)", async () => {
    const spy = vi.fn(async () => okResponse({ content: [], page: {} }));
    vi.stubGlobal("fetch", spy);
    await getBulletins();
    expect(spy).toHaveBeenCalledWith("/api/bulletins", {
      next: { revalidate: 60 },
    });
  });

  it("비 200이면 throw", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500 }) as Response),
    );
    await expect(getBulletins({})).rejects.toThrow(
      "GET /api/bulletins 실패: 500",
    );
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/lib/api/bulletins.test.ts`
Expected: FAIL — `Cannot find module './bulletins'` (모듈 미존재)

- [ ] **Step 3-a: 타입 추가** — `src/lib/api/types.ts` 끝(`EventDetailResponse` 정의 뒤)에 추가

```ts
// 주보 카드 — 본문 없음, PDF는 mediaId FK(가이드 10장, OpenAPI BulletinCardResponse).
// 상세 타입은 선언하지 않는다(상세 페이지 없음 — 스펙 D2).
export interface BulletinCardResponse {
  id: number;
  title: string;
  serviceDate: string; // date (yyyy-MM-dd) — 예배일
  mediaId: number;
  createdAt: string; // LocalDateTime
  author?: string | null; // 서버 마스킹 적용(가이드 7장) — 그대로 표기
}
```

- [ ] **Step 3-b: API 클라이언트 작성** — `src/lib/api/bulletins.ts`

```ts
import { apiUrl } from "@/lib/auth/apiBase";
import { buildListQuery, type ListQuery, type Page } from "@/lib/page";
import type { BulletinCardResponse } from "./types";

// 주보 목록 파라미터 — 필터 없음(가이드 10장). 공용 ListQuery에서 tagId만 타입으로 차단.
// sort 미지정 시 백엔드 기본 serviceDate,desc(예배일 내림차순).
export type BulletinListParams = Omit<ListQuery, "tagId">;

// 목록(공개) — 캐시 가능(revalidate 60). 서버 컴포넌트 전용. 정렬은 서버 신뢰(재정렬 금지).
// 주보는 조회수 부수효과가 없어 상세도 캐시 가능하지만, 상세 fetch 자체가 불필요(스펙 D2).
export async function getBulletins(
  p: BulletinListParams = {},
): Promise<Page<BulletinCardResponse>> {
  const res = await fetch(apiUrl(`/api/bulletins${buildListQuery(p)}`), {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`GET /api/bulletins 실패: ${res.status}`);
  return (await res.json()) as Page<BulletinCardResponse>;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run src/lib/api/bulletins.test.ts`
Expected: PASS — 3개 테스트 통과

- [ ] **Step 5: 커밋**

```bash
git add src/lib/api/types.ts src/lib/api/bulletins.ts src/lib/api/bulletins.test.ts
git commit -m "feat: 주보 API 클라이언트·BulletinCardResponse 타입 #14"
```

---

## Task 3: `BulletinRow` 컴포넌트

NoticeRow의 시각 문법(hairline 행·hover 제목 primary 전이·행 전체 클릭)을 따르되, 외부 anchor(`target="_blank"`) + author 줄을 가진 독립 컴포넌트(스펙 D4 — NoticeRow는 건드리지 않는다).

**Files:**
- Create: `src/components/cards/BulletinRow.tsx`
- Test: `src/components/cards/BulletinRow.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성** — `src/components/cards/BulletinRow.test.tsx`

외부 `<a>`라 next/link mock이 필요 없다(NoticeRow 테스트와의 차이).

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BulletinRow } from "./BulletinRow";

describe("BulletinRow", () => {
  it("제목·날짜·작성자를 렌더하고 행 전체가 새 탭 PDF 링크다", () => {
    render(
      <BulletinRow
        title="6월 둘째 주 주보"
        date="2026. 6. 7."
        author="김집사"
        pdfUrl="/api/media/31"
      />,
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/api/media/31");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByText("6월 둘째 주 주보")).toBeDefined();
    expect(screen.getByText("2026. 6. 7.")).toBeDefined();
    expect(screen.getByText("김집사")).toBeDefined();
  });

  it("새 탭 열림을 스크린리더에 안내한다(sr-only)", () => {
    render(<BulletinRow title="t" date="d" pdfUrl="/api/media/1" />);
    expect(screen.getByText("(새 탭에서 PDF 열림)")).toBeDefined();
  });

  it("author가 없으면 작성자 줄을 렌더하지 않는다", () => {
    render(<BulletinRow title="t" date="d" author={null} pdfUrl="/api/media/1" />);
    // 링크 전체 텍스트 = 제목 + sr-only 안내 + 날짜뿐 — 작성자 줄 없음
    expect(screen.getByRole("link").textContent).toBe("t(새 탭에서 PDF 열림)d");
  });

  it("서버 마스킹 값('(탈퇴한 사용자)' 등)은 그대로 표기한다", () => {
    render(
      <BulletinRow title="t" date="d" author="(탈퇴한 사용자)" pdfUrl="/api/media/1" />,
    );
    expect(screen.getByText("(탈퇴한 사용자)")).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/components/cards/BulletinRow.test.tsx`
Expected: FAIL — `Cannot find module './BulletinRow'`

- [ ] **Step 3: 컴포넌트 작성** — `src/components/cards/BulletinRow.tsx`

```tsx
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface BulletinRowProps {
  title: string;
  /** formatDate(serviceDate) 결과 — 포맷 책임은 호출부(스펙 §4) */
  date: string;
  /** 서버 마스킹 그대로 표기(가이드 7장). null/빈 값이면 줄 생략 */
  author?: string | null;
  /** apiUrl 결합 완료된 /api/media/{mediaId} URL */
  pdfUrl: string;
}

// 주보 행(DESIGN.md bulletin-row) — notice-row 변형. 외부(백엔드 오리진) PDF라
// next/link 대신 anchor + 새 탭. 행 전체가 클릭 영역, 하단 hairline.
export function BulletinRow({ title, date, author, pdfUrl }: BulletinRowProps) {
  return (
    <a
      href={pdfUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex items-center justify-between gap-base border-b border-hairline py-base",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
      )}
    >
      <span className="flex min-w-0 flex-col gap-xs">
        {/* hover 시 제목만 primary로 전이 — 행 전체가 링크임을 조용히 알린다(NoticeRow와 동일). */}
        <span
          className={cn(
            typo.titleSm,
            "truncate text-ink transition-colors duration-150 ease-out group-hover:text-primary",
          )}
        >
          {title}
          <span className="sr-only">(새 탭에서 PDF 열림)</span>
        </span>
        {author ? (
          <span className={cn(typo.bodySm, "text-muted")}>{author}</span>
        ) : null}
      </span>
      <span className={cn(typo.datetime, "shrink-0 text-muted")}>{date}</span>
    </a>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run src/components/cards/BulletinRow.test.tsx`
Expected: PASS — 4개 테스트 통과

- [ ] **Step 5: 커밋**

```bash
git add src/components/cards/BulletinRow.tsx src/components/cards/BulletinRow.test.tsx
git commit -m "feat: BulletinRow 행 컴포넌트(새 탭 PDF 링크) #14"
```

---

## Task 4: 목록 페이지 `/bulletins`

**Files:**
- Create: `src/app/(site)/bulletins/page.tsx`
- Test: `src/app/(site)/bulletins/page.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성** — `src/app/(site)/bulletins/page.test.tsx`

notices/page.test.tsx 패턴. 주보는 검색·태그가 없으므로 SearchPill·TagFilter mock 불필요. BulletinRow는 순수 anchor라 실제 렌더(스텁 안 함). 테스트 환경은 `NEXT_PUBLIC_API_BASE` 미설정 → `apiUrl`이 path만 반환(`apiBase.ts` 주석 참조) → href가 `/api/media/{id}`로 단언 가능.

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { getBulletins } = vi.hoisted(() => ({ getBulletins: vi.fn() }));
vi.mock("@/lib/api/bulletins", () => ({ getBulletins }));
// 클라이언트 자식은 스텁(next/navigation 의존 차단) — 자체 단위 테스트가 커버.
vi.mock("@/components/common/Pagination", () => ({
  Pagination: ({ page }: { page: { totalPages: number } }) => (
    <div data-testid="pagination" data-total={page.totalPages} />
  ),
}));

import BulletinsPage from "./page";

afterEach(() => vi.clearAllMocks());

const emptyPage = {
  content: [],
  page: { size: 10, number: 0, totalElements: 0, totalPages: 0 },
};

describe("BulletinsPage (목록)", () => {
  it("searchParams의 page를 파싱해 getBulletins에 전달", async () => {
    getBulletins.mockResolvedValueOnce(emptyPage);
    render(
      await BulletinsPage({ searchParams: Promise.resolve({ page: "2" }) }),
    );
    expect(getBulletins).toHaveBeenCalledWith({ page: 2 });
  });

  it("잘못된 page 파라미터는 undefined로 방어", async () => {
    getBulletins.mockResolvedValueOnce(emptyPage);
    render(
      await BulletinsPage({ searchParams: Promise.resolve({ page: "xyz" }) }),
    );
    expect(getBulletins).toHaveBeenCalledWith({ page: undefined });
  });

  it("빈 목록이면 EmptyState", async () => {
    getBulletins.mockResolvedValueOnce(emptyPage);
    render(await BulletinsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("등록된 주보가 없습니다.")).toBeDefined();
  });

  it("행을 서버 순서대로 렌더(재정렬 안 함)·PDF 새 탭 링크·날짜·작성자, totalPages>1이면 Pagination", async () => {
    getBulletins.mockResolvedValueOnce({
      content: [
        { id: 7, title: "6월 둘째 주 주보", serviceDate: "2026-06-07", mediaId: 31, createdAt: "2026-06-05T10:00:00", author: "김집사" },
        { id: 6, title: "6월 첫째 주 주보", serviceDate: "2026-05-31", mediaId: 28, createdAt: "2026-05-29T10:00:00", author: null },
      ],
      page: { size: 10, number: 0, totalElements: 12, totalPages: 2 },
    });
    render(await BulletinsPage({ searchParams: Promise.resolve({}) }));
    // 서버가 준 순서 그대로 — 최신 예배일(id 7, media 31)이 먼저. 검수 ①(serviceDate 내림차순은 서버 신뢰).
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2); // 행 수 = content 수(초과 렌더 회귀 방지)
    expect(links[0].getAttribute("href")).toBe("/api/media/31");
    expect(links[0].getAttribute("target")).toBe("_blank");
    expect(links[1].getAttribute("href")).toBe("/api/media/28");
    // 날짜 포맷(KST)·작성자·페이지네이션
    expect(screen.getByText("2026. 6. 7.")).toBeDefined();
    expect(screen.getByText("김집사")).toBeDefined();
    expect(screen.getByTestId("pagination").getAttribute("data-total")).toBe("2");
  });

  it("totalPages가 1이면 Pagination을 렌더하지 않는다", async () => {
    getBulletins.mockResolvedValueOnce({
      content: [
        { id: 1, title: "주보", serviceDate: "2026-06-07", mediaId: 3, createdAt: "2026-06-05T10:00:00", author: null },
      ],
      page: { size: 10, number: 0, totalElements: 1, totalPages: 1 },
    });
    render(await BulletinsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByTestId("pagination")).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run "src/app/(site)/bulletins/page.test.tsx"`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 3: 페이지 작성** — `src/app/(site)/bulletins/page.tsx`

```tsx
// src/app/(site)/bulletins/page.tsx
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { apiUrl } from "@/lib/auth/apiBase";
import { getBulletins } from "@/lib/api/bulletins";
import { BulletinRow } from "@/components/cards/BulletinRow";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";

type SearchParams = Record<string, string | string[] | undefined>;

// page만 파싱(주보는 검색·태그 필터 없음 — 가이드 10장). NaN 방어는 공지와 동일.
function toNum(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

// 공개 주보 목록. searchParams 접근 → 동적 렌더. 서버 정렬(serviceDate,desc) 신뢰.
// 행 클릭 = /api/media/{mediaId} 새 탭 PDF(스펙 D1 — 상세 페이지 없음).
export default async function BulletinsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const data = await getBulletins({ page: toNum(sp.page) });

  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>주보</h1>

      {data.content.length === 0 ? (
        <EmptyState message="등록된 주보가 없습니다." className="mt-xl" />
      ) : (
        <div className="mt-xl">
          {data.content.map((b) => (
            <BulletinRow
              key={b.id}
              title={b.title}
              date={formatDate(b.serviceDate)}
              author={b.author}
              pdfUrl={apiUrl(`/api/media/${b.mediaId}`)}
            />
          ))}
        </div>
      )}

      {data.page.totalPages > 1 ? (
        <div className="mt-xl">
          <Pagination page={data.page} />
        </div>
      ) : null}
    </Container>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run "src/app/(site)/bulletins/page.test.tsx"`
Expected: PASS — 5개 테스트 통과

- [ ] **Step 5: 커밋**

```bash
git add "src/app/(site)/bulletins/page.tsx" "src/app/(site)/bulletins/page.test.tsx"
git commit -m "feat: 주보 목록 페이지(/bulletins, 새 탭 PDF 열람) #14"
```

---

## Task 5: 전체 검증 (회귀 + 빌드)

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 테스트 (회귀 확인)**

Run: `pnpm test`
Expected: PASS — 기존 테스트 전부 green(공지·설교 등 무변경 확인) + 신규 12개

- [ ] **Step 2: 린트**

Run: `pnpm lint`
Expected: 에러 0

- [ ] **Step 3: 프로덕션 빌드**

Run: `pnpm build`
Expected: 성공. `/bulletins`는 searchParams 접근으로 **동적 렌더**(ƒ 표시) — 빌드 시 백엔드 fetch 없음(공지와 동일 패턴이라 CI에서도 안전)

- [ ] **Step 4: 수동 검수 (T13 §5 게이트, dev 서버 + 백엔드 기동 시)**

1. `/bulletins` 접속 → 목록이 예배일 내림차순으로 표시
2. 행 클릭 → 새 탭에서 PDF가 **inline 열람**(다운로드 강제 아님 — 백엔드 `Content-Disposition: inline` 확인)
3. author 마스킹 값(`"(탈퇴한 사용자)"` 등) 그대로 표기 확인
4. GNB 교회소식 → 주보 링크 동작 확인

> 백엔드 미기동 환경이면 1·2는 구현 보고서에 "백엔드 연동 검수 보류"로 기록하고 코드 검증(테스트·빌드)으로 갈음.

- [ ] **Step 5: 잔여 변경 확인**

Run: `git status --short`
Expected: 깨끗함(모든 변경이 Task 1~4에서 커밋됨). 잔여가 있으면 원인 확인 후 적절한 태스크 커밋에 포함.

---

## 검수 기준 매핑 (T13 완료 조건)

| T13 조건 | 커버 |
|---|---|
| 목록 `/bulletins`: serviceDate 내림차순, 카드(title·serviceDate·author) | Task 4 (서버 정렬 신뢰 — page.test "서버 순서대로" 테스트), Task 3 (행 필드) |
| 항목 클릭 → `/api/media/{mediaId}` PDF 인라인 열람 | Task 3 (anchor href·target), Task 5 Step 4 수동 검수 |
| author 마스킹 그대로 표기(7장) | Task 3 (마스킹 값 테스트), Task 4 (author 전달) |
