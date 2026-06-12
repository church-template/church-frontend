# 공지 (목록 · 검색 · 상세) 설계 — T11

**날짜:** 2026-06-12
**이슈:** `.issues/T11-notices.md` (라벨 `page`, 선행 T6·T7)
**참조:** 가이드 10장(공지)·3·5·7장, OpenAPI `/api/notices`·`/api/notices/{id}`
**패턴 기준:** 설교(T10) — `src/app/(site)/sermons/*`, `src/lib/api/sermons.ts`

---

## 1. 개요 (Overview)

공지 **목록(검색·태그 필터·페이지네이션)** 과 **상세(마크다운 본문)** 를 공개 서버 컴포넌트로 구현한다.
형태는 설교(T10)와 거의 동일하되 **더 단순**하다:

- 필터는 `q`(제목)·`tagId`·`page`뿐 — 설교의 `preacher/series/from/to` 없음.
- 목록은 그리드 카드가 아니라 **행(`NoticeRow`)** — DESIGN.md `notice-row` 정의(제목+날짜, 하단 헤어라인).
- 상세에 영상/오디오 없음. `isPinned`·`author`·`version`만 추가.

설교에서 이미 구현·검증된 공유 자산을 최대한 재사용하고, 공지 고유 로직만 신규 작성한다.

### 1.1 재사용 (신규 코드 0줄)

| 자산 | 경로 |
|---|---|
| `NoticeRow` (제목+날짜+고정/NEW 배지, 행 전체 링크) | `src/components/cards/NoticeRow.tsx` *(이미 존재)* |
| `Pagination` | `src/components/common/Pagination.tsx` |
| `TagFilter` | `src/components/common/TagFilter.tsx` |
| `MarkdownContent` | `src/components/common/MarkdownContent.tsx` |
| `Badge` | `src/components/ui/Badge.tsx` |
| `EmptyState` | `src/components/common/EmptyState.tsx` |
| `Container` | `src/components/shell/Container.tsx` |
| `formatDate` / `parseServerDate` | `src/lib/date.ts` |
| `apiUrl` | `src/lib/auth/apiBase.ts` |
| `Page<T>` 타입 | `src/lib/page.ts` |
| `getTags` | `src/lib/api/tags.ts` |
| `typo.*` | `src/constants/typography.ts` |

### 1.2 비목표 (Non-goals)

- 공지 작성/수정/삭제(어드민 `/api/admin/notices`)는 범위 밖.
- `isNew` 배지 — `NoticeRow`에 prop은 있으나 백엔드가 주지 않으므로 **사용 안 함**.
- 페이지 제목·빈 문구 상수화 — 설교 목록과 동일하게 **인라인 문자열** 유지(일관성, 별도 리팩터 안 함).

---

## 2. 라우트 · 데이터 경계

- `(site)` 그룹 아래 **서버 컴포넌트 2개**. 공개 페이지 = 서버 `fetch` (가이드 15.1).
- **목록** `notices/page.tsx` — ISR `next: { revalidate: 60 }` (캐시 가능). `searchParams` 접근으로 동적 렌더.
- **상세** `notices/[id]/page.tsx` — `cache: 'no-store'` (조회수 +1 부수효과, 검수 §5). 동적 렌더.
- 정렬은 서버가 보장(`isPinned,createdAt` 모두 desc → 고정글 우선·최신순). **프론트 재정렬 금지**(검수 §5).

---

## 3. API 레이어 — `src/lib/api/notices.ts` (신규)

설교 `sermons.ts`와 동일 구조, 필터만 축소.

```ts
import { apiUrl } from "@/lib/auth/apiBase";
import type { Page } from "@/lib/page";
import type { NoticeCardResponse, NoticeDetailResponse } from "./types";

export interface NoticeListParams {
  page?: number;
  size?: number;
  sort?: string;   // 미지정 시 백엔드 기본 isPinned,createdAt desc
  tagId?: number;
  q?: string;      // 제목만 매칭(가이드 10장, 코드가 사실)
}

export function buildNoticeQuery(p: NoticeListParams): string {
  const sp = new URLSearchParams();
  if (p.page != null) sp.set("page", String(p.page));
  if (p.size != null) sp.set("size", String(p.size));
  if (p.sort) sp.set("sort", p.sort);
  if (p.tagId != null) sp.set("tagId", String(p.tagId));
  if (p.q) sp.set("q", p.q);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// 목록(공개) — 캐시 가능(revalidate 60). 서버 컴포넌트 전용.
export async function getNotices(
  p: NoticeListParams = {},
): Promise<Page<NoticeCardResponse>> {
  const res = await fetch(apiUrl(`/api/notices${buildNoticeQuery(p)}`), {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`GET /api/notices 실패: ${res.status}`);
  return (await res.json()) as Page<NoticeCardResponse>;
}

// 상세(공개) — GET마다 조회수+1(부수효과) → no-store. 404는 null(호출부가 notFound).
export async function getNotice(
  id: number,
): Promise<NoticeDetailResponse | null> {
  const res = await fetch(apiUrl(`/api/notices/${id}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /api/notices/${id} 실패: ${res.status}`);
  return (await res.json()) as NoticeDetailResponse;
}
```

> **`sort` 미전송 근거:** 백엔드 기본 정렬(`isPinned,createdAt` desc)이 곧 요구 정렬이므로 파라미터를 보내지 않는다. 설교 `getSermons`와 동일한 방식(기본 정렬 신뢰).
>
> **`size` 미전송:** 설교와 동일하게 `size`를 명시하지 않고 백엔드 `@PageableDefault`를 따른다(인터페이스엔 옵션으로 남겨둠). 향후 커스텀 페이지 크기가 필요하면 `notices/page.tsx`에서 `size`를 전달.

---

## 4. 타입 — `src/lib/api/types.ts` (수정)

`NoticeCardResponse`는 이미 존재. **`NoticeDetailResponse`만 신규 추가** (OpenAPI `NoticeDetailResponse` 스키마 그대로).

```ts
// 상세 응답 — 카드 메타 + 본문·낙관적 락(가이드 10장, OpenAPI NoticeDetailResponse).
export interface NoticeDetailResponse {
  id: number;
  title: string;
  content: string; // raw 마크다운
  isPinned: boolean;
  viewCount: number;
  createdAt: string; // LocalDateTime
  updatedAt: string;
  version: number;
  tags: TagResponse[];
  author?: string | null; // 서버 마스킹 적용
}
```

---

## 5. 공유 검색 컴포넌트 — `src/components/common/SearchPill.tsx` (신규, 추출)

설교 `SermonSearch`는 placeholder·aria-label만 도메인 특화이고 로직(q 보존/리셋·page 삭제·X클리어·Suspense 경계·`key` remount 동기화)은 범용이다. 이를 **공유 컴포넌트로 추출**하고 설교·공지가 함께 쓴다.

**`SearchPill` props:**

```ts
interface SearchPillProps {
  placeholder: string;
  ariaLabel: string;
}
```

- 내부 동작은 현 `SermonSearch`와 **동일**: `usePathname`/`useRouter`/`useSearchParams`, 기존 쿼리 보존하며 `q` set/delete + `page` 삭제, X로 클리어, `Suspense` fallback `<div className="h-11" />`, 현재 `q`로 `key` remount해 외부 URL 변경 동기화.
- **`SermonSearch` 마이그레이션(순수 리팩터, 동작 불변):**
  ```tsx
  export function SermonSearch() {
    return <SearchPill placeholder="제목·설교자·시리즈·성경구절" ariaLabel="설교 검색" />;
  }
  ```
  기존 `SermonSearch.test.tsx`는 위임 후에도 green을 유지하도록 한다(필요 시 import 경로만 조정, 단언은 유지).
- **공지 사용:** `<SearchPill placeholder="제목" ariaLabel="공지 검색" />`
  → placeholder "제목"으로 **제목만 검색**임을 명시(내용 검색 기대 UI 만들지 않음, 이슈 §1).

> **영향 범위 주의:** 출시된 설교 컴포넌트를 건드린다. `SermonSearch.test.tsx`로 회귀를 막고, 리팩터는 동작 동일성만 목표로 한다(추가 기능 없음).

---

## 6. 목록 페이지 — `src/app/(site)/notices/page.tsx` (신규)

설교 `sermons/page.tsx` 미러링, 필터 축소·행 레이아웃.

- **searchParams 파싱:** `q`(`toStr`)·`tagId`(`toNum`)·`page`(`toNum`)만. 설교의 `preacher/series/from/to`·`toDate`·`DATE_RE` 제거. (`toStr`/`toNum` 헬퍼는 설교 페이지와 동일 구현 — 공지 페이지 내 재정의.)
- **데이터:** `Promise.all([getNotices(params), getTags()])`.
- **렌더 구조:**
  ```
  <Container as="section" className="py-section">
    <h1 className={cn(typo.displayMd, "text-ink")}>공지</h1>

    <div className="mt-lg flex flex-col gap-base">
      <SearchPill placeholder="제목" ariaLabel="공지 검색" />
      <TagFilter tags={tags} />
      {/* ActiveFilters 없음 — q는 검색창, tagId는 TagFilter로 이미 보임 */}
    </div>

    {data.content.length === 0 ? (
      <EmptyState message="조건에 맞는 공지가 없습니다." className="mt-xl" />
    ) : (
      <div className="mt-xl">
        {data.content.map((n) => (
          <NoticeRow
            key={n.id}
            href={`/notices/${n.id}`}
            title={n.title}
            date={formatDate(n.createdAt)}
            isPinned={n.isPinned}
          />
        ))}
      </div>
    )}

    {data.page.totalPages > 1 ? (
      <div className="mt-xl"><Pagination page={data.page} /></div>
    ) : null}
  </Container>
  ```
- 행은 **서버가 준 순서 그대로** 렌더(고정 우선 재정렬 안 함). `isNew` 미전달.
- `NoticeRow`는 행마다 하단 헤어라인이 있어 별도 래퍼 보더 불필요.
- `formatDate(createdAt)`는 내부에서 `parseServerDate`(+09:00 KST)를 호출하므로 offset 없는 `createdAt`을 **그대로 넘긴다**(이중 파싱 금지).

---

## 7. 상세 페이지 — `src/app/(site)/notices/[id]/page.tsx` (신규)

설교 `sermons/[id]/page.tsx` 미러링, 영상/오디오·설교자/시리즈/성경 메타 제거.

- **검증:** `numId = Number(id)`; `Number.isInteger(numId) && numId > 0` 아니면 `notFound()`.
- **데이터:** `getNotice(numId)`; `null`이면 `notFound()`.
- **렌더 순서:**
  1. 뒤로 링크 `/notices` — `<ChevronLeft size={16}/> 공지 목록` (설교와 동일 패턴)
  2. **`isPinned`이면** 제목 위 `<Badge variant="primary">고정</Badge>` (목록과 일관)
  3. 제목 — `typo.titleLg`, `text-ink`
  4. 메타 행 — `typo.datetime`, `text-muted`:
     `{formatDate(notice.createdAt)} · 조회 {notice.viewCount.toLocaleString("ko-KR")}{notice.author ? ` · ${notice.author}` : ""}`
  5. 태그 — 각 `Link href={`/notices?tagId=${t.id}`}` 안에 `<Badge>{t.name}</Badge>` (설교 상세와 동일, 경로만 `/notices`)
  6. 구분선 `border-t border-hairline` + `<MarkdownContent source={notice.content} className="mt-lg" />`
- `author`는 서버 마스킹 그대로 표기(가이드 7장).

---

## 8. 에러 처리

- **목록/태그 fetch 실패** → `getNotices`/`getTags`가 throw → 기존 라우트 `error.tsx` 바운더리가 처리(설교와 동일).
- **상세 404** → `getNotice`가 `null` → `notFound()` → `not-found.tsx`.
- **잘못된 id**(비정수·0 이하) → fetch 전에 `notFound()`.
- 에러 분기는 표준 패턴(throw → 바운더리)만 사용. 이 페이지들에 도메인별 `errorCode` 토스트 분기는 불필요(공개 GET, 가이드 4장 토스트는 회원/폼 영역 대상).

---

## 9. 캐시 요약

| 호출 | 캐시 | 이유 |
|---|---|---|
| `getNotices` (목록) | `next: { revalidate: 60 }` | 캐시 가능(이슈 §2) |
| `getNotice` (상세) | `cache: 'no-store'` | 조회수 +1 매번(검수 §5) |
| `getTags` | 기존 설정(revalidate) | 변동 적음, 공유 |

---

## 10. 테스트 (vitest, 80%+ 목표) — 설교 미러링

| 파일 | 핵심 단언 | 검수 매핑 (이슈 §5) |
|---|---|---|
| `src/lib/api/notices.test.ts` (신규) | `buildNoticeQuery` 직렬화(page·size·sort·tagId·q, 빈 입력 `""`) · `getNotices` revalidate 60 · `getNotice` **no-store**·404→null·!ok throw | 매번 백엔드 호출 |
| `src/components/common/SearchPill.test.tsx` (신규) | q set/clear · page 리셋 · 기존 파라미터 보존 · placeholder/aria 반영 | 검색 제목만(placeholder "제목") |
| `src/components/sermons/SermonSearch.test.tsx` (유지/조정) | 위임 후에도 기존 단언 green | 회귀 방지 |
| `src/app/(site)/notices/page.test.tsx` (신규) | **서버 순서 유지(고정 우선 재정렬 안 함)** · 빈 상태 메시지 · `totalPages>1`만 Pagination · q·tagId가 `getNotices`로 전달 · **잘못된 파라미터 방어**(tagId="abc"·page="2.5" → undefined, 설교 page.test 미러) · ActiveFilters 부재 | 고정글 상단 |
| `src/app/(site)/notices/[id]/page.test.tsx` (신규) | **no-store 호출** · content 마크다운 렌더 · **메타 순서**(날짜 · 조회수 · author 옵션) · author 표기 · 태그 링크 href `/notices?tagId={id}` 형식 · 잘못된 id(비정수·0 이하)·404 → notFound | 매번 호출 |

**완료 조건(이슈 §4) 매핑:**
- [ ] 목록 `/notices`: 정렬(고정 우선)/필터(q·tagId)/Pagination/TagFilter, isPinned 배지 → §6 + page.test
- [ ] 검색 안내문구 "제목" → §5·§6 SearchPill placeholder
- [ ] 상세 `/notices/{id}`: no-store, content 마크다운, author → §7 + [id]/page.test

---

## 11. 파일 인벤토리

**신규**
- `src/lib/api/notices.ts`
- `src/components/common/SearchPill.tsx` (새 파일이지만 SermonSearch 로직을 추출한 것 — 신규 동작 없음)
- `src/app/(site)/notices/page.tsx`
- `src/app/(site)/notices/[id]/page.tsx`
- `src/lib/api/notices.test.ts`
- `src/components/common/SearchPill.test.tsx`
- `src/app/(site)/notices/page.test.tsx`
- `src/app/(site)/notices/[id]/page.test.tsx`

**수정**
- `src/lib/api/types.ts` — `NoticeDetailResponse` 추가
- `src/components/sermons/SermonSearch.tsx` — `SearchPill` 위임으로 리팩터
- `src/components/sermons/SermonSearch.test.tsx` — 위임 후 green 유지(필요 시 조정)

---

## 12. 확정된 판단 항목

1. **상세 상단 고정 Badge** — `isPinned`이면 표시(목록과 일관). ✅
2. **빈 메시지** — "조건에 맞는 공지가 없습니다." ✅
3. **페이지 제목/빈 문구** — 인라인 문자열(설교와 동일, 상수화 안 함). ✅
