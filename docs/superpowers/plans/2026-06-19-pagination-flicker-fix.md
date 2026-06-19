# 목록 페이지네이션 깜빡임·스크롤 점프 제거 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회원 영역 클라이언트 목록(회원 관리·미디어 라이브러리·갤러리 앨범)에서 페이지 전환 시 스켈레톤 깜빡임과 상단 스크롤 점프를 제거한다.

**Architecture:** TanStack Query v5의 `placeholderData: keepPreviousData`로 페이지 전환 중 이전 행을 유지(깜빡임 제거)하고, 공유 `Pagination`에 선택적 `scroll` prop을 추가해 대상 목록만 스크롤 점프를 끈다(공개 ISR 페이지 동작은 기본값으로 보존). 로딩 중에는 `isPlaceholderData`로 목록에 미세 디밍을 건다.

**Tech Stack:** Next.js 16 (App Router), React, TypeScript, `@tanstack/react-query` ^5.101, Tailwind, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-19-pagination-flicker-fix-design.md`

## Global Constraints

- 커밋 메시지에 Co-Authored-By 태그 절대 금지.
- 커밋은 사용자 명시 요청 시에만 — 실행 중 각 커밋 단계 전에 사용자 승인을 받는다(자동 커밋 금지). 본 프로젝트 규칙이 TDD의 frequent-commit보다 우선.
- 답변·주석은 한국어. 주석은 WHY 중심, 주변 스타일에 맞춘다.
- JSX 조건부 렌더링은 삼항(`{cond ? <X/> : null}`). `{cond && <X/>}` 금지. 단, `cn()` 내부 className 조합의 `&&`는 허용.
- hex·px 인라인 금지, arbitrary value(`bg-[#...]`·`opacity-[..]`) 금지. 표준 Tailwind 유틸만 사용(여기선 `opacity-60`·`transition-opacity`).
- 텍스트 스타일은 `typo.*` 상수(이 작업은 새 텍스트 없음 — 해당 없음).
- 테스트 관례: vitest `globals:false` → `describe/it/expect/vi` 명시 import. jest-dom 미사용 → `getAttribute`/`toBeDefined`로 단언. `next/link`·`next/navigation`은 `vi.mock`.
- `pnpm lint`는 타입체크를 하지 않음 → 타입 검증은 `npx tsc --noEmit` 별도 실행.

---

### Task 1: Pagination `scroll` prop 추가

공유 `Pagination`/`PaginationControls`/`Arrow`에 선택적 `scroll` prop을 추가한다. 기본값 `true`로 공개 ISR 페이지(설교·공지·주보)의 현재 스크롤-투-탑 동작을 보존하고, 대상 목록은 `scroll={false}`로 호출(호출부는 Task 2). next/link는 `scroll`을 받아 네비게이션 시 스크롤 상단 이동 여부를 결정한다.

**Files:**
- Modify: `src/components/common/Pagination.tsx`
- Test: `src/components/common/Pagination.test.tsx`

**Interfaces:**
- Consumes: `PageMeta`(`src/lib/page.ts`) — 기존.
- Produces:
  - `Pagination({ page: PageMeta; scroll?: boolean })` — `scroll` 기본값 `true`.
  - `PaginationControls({ page: PageMeta; scroll?: boolean })` — `scroll` 기본값 `true`.
  - (Task 2가 `<Pagination page={...} scroll={false} />` 형태로 소비)

- [ ] **Step 1: next/link mock이 `scroll`을 노출하도록 보강 + 실패 테스트 작성**

`src/components/common/Pagination.test.tsx`의 `next/link` mock을 교체하고(scroll을 `data-scroll`로 노출), 파일 끝의 `describe` 뒤에 새 describe 블록을 추가한다.

mock 교체 — 기존 (10~16행):
```tsx
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
```
교체 후:
```tsx
vi.mock("next/link", () => ({
  // scroll은 유효한 DOM 속성이 아니므로 data-scroll로 노출해 전달 여부를 검증한다.
  default: ({
    href,
    children,
    scroll,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    scroll?: boolean;
  }) => (
    <a href={href} data-scroll={scroll === undefined ? undefined : String(scroll)} {...rest}>
      {children}
    </a>
  ),
}));
```

파일 끝에 추가:
```tsx
describe("PaginationControls scroll prop", () => {
  const page = { size: 10, number: 1, totalElements: 95, totalPages: 10 };

  it("scroll={false}면 숫자 링크에 scroll 전달(목록 스크롤 점프 방지)", () => {
    render(<PaginationControls page={page} scroll={false} />);
    const link = screen.getByRole("link", { name: "3" });
    expect(link.getAttribute("data-scroll")).toBe("false");
  });

  it("scroll={false}면 다음 화살표 링크에도 전달", () => {
    render(<PaginationControls page={page} scroll={false} />);
    const next = screen.getByTestId("pagination-next");
    expect(next.getAttribute("data-scroll")).toBe("false");
  });

  it("기본값은 scroll 유지(true) — 공개 ISR 페이지 동작 보존", () => {
    render(<PaginationControls page={page} />);
    const link = screen.getByRole("link", { name: "3" });
    expect(link.getAttribute("data-scroll")).toBe("true");
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `pnpm test -- src/components/common/Pagination.test.tsx`
Expected: 새 3개 테스트 FAIL — 구현 전이라 숫자 링크/화살표에 `scroll`이 전달되지 않아 `data-scroll`이 `null`(scroll={false} 케이스: `null !== "false"`, 기본값 케이스: `null !== "true"`). 기존 테스트는 PASS.

- [ ] **Step 3: `Pagination.tsx`에 scroll 배선**

`src/components/common/Pagination.tsx`를 다음과 같이 수정한다.

`PaginationControls` 시그니처(24행)와 숫자 `<Link>`(56~63행), `Arrow` 호출(41·65행)에 `scroll` 추가:
```tsx
function PaginationControls({ page, scroll = true }: { page: PageMeta; scroll?: boolean }) {
```
이전 화살표(41행) → `<Arrow href={hrefFor(number - 1)} disabled={isFirst} dir="prev" scroll={scroll} />`
다음 화살표(65행) → `<Arrow href={hrefFor(number + 1)} disabled={isLast} dir="next" scroll={scroll} />`
숫자 링크(56~63행):
```tsx
          <Link
            key={it}
            href={hrefFor(it)}
            scroll={scroll}
            className="inline-flex size-9 items-center justify-center rounded-md text-ink hover:bg-surface-strong"
          >
            {it + 1}
          </Link>
```

`Arrow` 시그니처(70행)와 활성 `<Link>`(84~92행)에 `scroll` 추가:
```tsx
function Arrow({ href, disabled, dir, scroll }: { href: string; disabled: boolean; dir: "prev" | "next"; scroll?: boolean }) {
```
```tsx
  return (
    <Link
      data-testid={`pagination-${dir}`}
      href={href}
      scroll={scroll}
      aria-label={dir === "prev" ? "이전 페이지" : "다음 페이지"}
      className={cn(cls, "text-ink hover:bg-surface-strong")}
    >
      <Icon size={18} />
    </Link>
  );
```

`Pagination`(97~103행)에 scroll 추가:
```tsx
export function Pagination({ page, scroll = true }: { page: PageMeta; scroll?: boolean }) {
  return (
    <Suspense fallback={<div className="h-9" aria-hidden />}>
      <PaginationControls page={page} scroll={scroll} />
    </Suspense>
  );
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `pnpm test -- src/components/common/Pagination.test.tsx`
Expected: 모든 테스트 PASS(신규 3 + 기존 4).

- [ ] **Step 5: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 6: 커밋 (사용자 승인 후)**

```bash
git add src/components/common/Pagination.tsx src/components/common/Pagination.test.tsx
git commit -m "feat : Pagination scroll prop 추가(공개 페이지 동작 보존)"
```

---

### Task 2: 목록 3곳에 keepPreviousData + 미세 디밍 + scroll={false} 적용

회원 관리·미디어 라이브러리·갤러리 앨범의 목록 쿼리에 `placeholderData: keepPreviousData`를 적용해 페이지 전환 깜빡임을 제거하고, 로딩 중 `isPlaceholderData`로 목록 컨테이너에 미세 디밍을 건다. 세 목록의 `<Pagination>` 호출에 `scroll={false}`를 전달한다.

`keepPreviousData`는 쿼리 옵션 한 줄이라 단위 테스트로 격리하기 어렵다(스펙 §5에서 확인). 검증은 `pnpm lint`·`npx tsc --noEmit`·실행 화면 확인을 게이트로 둔다. 전역 `QueryClient` 기본옵션에는 적용하지 않는다 — 상세 쿼리까지 영향을 받으므로 목록 쿼리에만 개별 적용한다.

**Files:**
- Modify: `src/components/admin/members/MemberManager.tsx`
- Modify: `src/components/admin/media/MediaLibrary.tsx`
- Modify: `src/components/gallery/queries.ts`
- Modify: `src/components/gallery/AlbumList.tsx`

**Interfaces:**
- Consumes: Task 1의 `Pagination({ page, scroll? })`.
- Consumes: `keepPreviousData`(`@tanstack/react-query`), `useQuery` 결과의 `isPlaceholderData: boolean`.
- Produces: 없음(소비 종단).

- [ ] **Step 1: MemberManager — keepPreviousData + 디밍 + scroll**

`src/components/admin/members/MemberManager.tsx`:

import(2행) 교체:
```tsx
import { useQuery, keepPreviousData } from "@tanstack/react-query";
```

쿼리(34~38행)에 `placeholderData` 추가:
```tsx
  const members = useQuery({
    queryKey: adminKeys.list("members", params),
    queryFn: () => listMembers(params),
    placeholderData: keepPreviousData,
    retry: false,
  });
```

`<DataTable>`(90~106행)을 디밍 wrapper로 감싸고, `<Pagination>`(107행)에 `scroll={false}` 추가:
```tsx
        <div
          aria-busy={members.isPlaceholderData}
          className={cn(members.isPlaceholderData && "opacity-60 transition-opacity")}
        >
          <DataTable
            columns={columns}
            rows={members.data?.content ?? []}
            rowKey={(m) => m.uuid}
            loading={members.isPending}
            empty={<EmptyState message="조회된 회원이 없습니다." />}
            actions={(m) => (
              <Button
                type="button"
                variant="tertiary"
                aria-label={`${m.name} 상세`}
                onClick={() => setSelected(m.uuid)}
              >
                상세
              </Button>
            )}
          />
        </div>
        {members.data && members.data.page.totalPages > 1 ? <Pagination page={members.data.page} scroll={false} /> : null}
```

- [ ] **Step 2: MediaLibrary — keepPreviousData + 디밍 + scroll**

`src/components/admin/media/MediaLibrary.tsx`:

import(3행) 교체:
```tsx
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
```

쿼리(44~48행)에 `placeholderData` 추가:
```tsx
  const media = useQuery({
    queryKey: adminKeys.list("media", params),
    queryFn: () => listMedia(params),
    placeholderData: keepPreviousData,
    retry: false,
  });
```

`<DataTable>`(121~143행)을 디밍 wrapper로 감싸고, `<Pagination>`(145행)에 `scroll={false}` 추가:
```tsx
      <div
        aria-busy={media.isPlaceholderData}
        className={cn(media.isPlaceholderData && "opacity-60 transition-opacity")}
      >
        <DataTable
          columns={columns}
          rows={media.data?.content ?? []}
          rowKey={(m) => m.id}
          loading={media.isPending}
          empty={<EmptyState message="등록된 미디어가 없습니다." />}
          actions={(m) => (
            <div className="flex justify-end gap-xs">
              {/* 열기: 공개 서빙 URL 새 탭 — 이미지 미리보기·PDF 다운로드 */}
              <a
                href={apiUrl(`/api/media/${m.id}`)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants("secondary")}
              >
                열기
              </a>
              <Button type="button" variant="secondary" onClick={() => check.mutate(m)}>
                삭제
              </Button>
            </div>
          )}
        />
      </div>

      {media.data && media.data.page.totalPages > 1 ? <Pagination page={media.data.page} scroll={false} /> : null}
```

- [ ] **Step 3: gallery 쿼리 — keepPreviousData**

`src/components/gallery/queries.ts`:

import(2행) 교체:
```tsx
import { useQuery, keepPreviousData } from "@tanstack/react-query";
```

`useAlbums`(8~14행)에 `placeholderData` 추가:
```tsx
export function useAlbums(params: AlbumListParams) {
  return useQuery({
    queryKey: ["albums", params],
    queryFn: () => fetchAlbums(params),
    placeholderData: keepPreviousData,
    retry: false,
  });
}
```

- [ ] **Step 4: AlbumList — 디밍 + scroll**

`src/components/gallery/AlbumList.tsx`:

앨범 그리드(53~64행)의 grid div에 디밍을, `<Pagination>`에 `scroll={false}`를 추가:
```tsx
        <>
          <div
            aria-busy={albums.isPlaceholderData}
            className={cn(
              "grid gap-base sm:grid-cols-2 lg:grid-cols-3",
              albums.isPlaceholderData && "opacity-60 transition-opacity",
            )}
          >
            {albums.data.content.map((a) => (
              <AlbumCard key={a.id} album={a} />
            ))}
          </div>
          {albums.data.page.totalPages > 1 ? (
            <div className="mt-xl">
              <Pagination page={albums.data.page} scroll={false} />
            </div>
          ) : null}
        </>
```

- [ ] **Step 5: lint + 타입체크**

Run: `pnpm lint`
Expected: 에러 없음(특히 set-state-in-effect·삼항 규칙 위반 없음).
Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 6: 기존 테스트 회귀 확인**

Run: `pnpm test`
Expected: 전체 PASS(이번 변경으로 깨지는 기존 테스트 없음).

- [ ] **Step 7: 실행 화면 동작 확인**

`pnpm dev`로 띄운 뒤(백엔드 연동 필요), 다음을 수동 확인한다. 백엔드가 없으면 이 단계는 검증 보류로 명시하고 사용자에게 알린다.
1. `/mypage/manage/members` — 회원이 10명 초과해 페이지가 2개 이상일 때, 다음 페이지 클릭 시 표가 스켈레톤으로 비워지지 않고 이전 행이 유지되다 새 행으로 교체되는지.
2. 페이지 클릭 시 화면이 상단으로 스크롤 점프하지 않는지.
3. 로딩 중 표가 살짝 흐려지는지(`aria-busy`).
4. 미디어 라이브러리·갤러리 앨범에서도 동일 동작.
5. 공개 페이지(`/sermons` 등)는 기존대로 페이지 클릭 시 스크롤 상단 이동이 유지되는지(회귀 없음).

- [ ] **Step 8: 커밋 (사용자 승인 후)**

```bash
git add src/components/admin/members/MemberManager.tsx src/components/admin/media/MediaLibrary.tsx src/components/gallery/queries.ts src/components/gallery/AlbumList.tsx
git commit -m "feat : 목록 페이지 전환 깜빡임·스크롤 점프 제거(keepPreviousData)"
```

---

## Self-Review

**1. Spec coverage**
- §3.1 keepPreviousData → Task 2 Step 1·2·3. ✓
- §3.2 Pagination scroll prop(기본 true) → Task 1. ✓
- §3.3 미세 디밍 + aria-busy → Task 2 Step 1·2·4. ✓
- §4.1~4.5 파일별 변경 → Task 1(4.1), Task 2(4.2~4.5). ✓
- §5 검증(Pagination scroll 단위 테스트, 실행 검증, lint/tsc) → Task 1 Step 1~5, Task 2 Step 5~7. ✓
- §6 성공 기준(공개 페이지 회귀 없음) → Task 1 기본값 테스트 + Task 2 Step 7-5. ✓

**2. Placeholder scan**: TBD/TODO/"적절히 처리" 등 없음. 모든 코드 단계에 실제 코드 포함. ✓

**3. Type consistency**: `scroll?: boolean`이 Pagination·PaginationControls·Arrow에서 일관. `placeholderData: keepPreviousData`·`isPlaceholderData` 명칭이 TanStack Query v5 API와 일치. `members`/`media`/`albums` 쿼리 변수명이 각 파일 기존 명칭과 일치. ✓
