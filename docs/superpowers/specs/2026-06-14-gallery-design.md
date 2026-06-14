# 갤러리(회원전용) 설계 — T16

**작성일:** 2026-06-14
**이슈:** `.issues/T16-gallery.md`
**참조:** 가이드 2.3·5장·6장·10장·15.1, OpenAPI `/api/gallery/**`, DESIGN.md(`sermon-card`·`department-card`·`Dialog`)

---

## 0. 목적·범위

회원 전용 갤러리(앨범 목록/상세)를 **권한 게이팅과 함께 조회 전용**으로 구현한다. 비공개 경로 — `GALLERY_VIEW` 필요.

**범위 안:** 앨범 목록(`/gallery`), 앨범 상세(`/gallery/albums/{id}`), 권한 게이팅, 사진 라이트박스.
**범위 밖(YAGNI):** 앨범·사진 생성/수정/삭제(어드민 `GALLERY_WRITE`), 무한스크롤, 다운로드 버튼, EXIF 등 미요청 기능. (이슈 §4 명시 — 조회만)

---

## 1. 아키텍처 결정 — 왜 클라이언트 페이지인가

설교·공지 같은 공개 페이지는 서버 컴포넌트 + ISR이지만, **갤러리는 `GALLERY_VIEW` 회원 전용이라 토큰이 필요**하다. 따라서 가이드 15.1 데이터 패칭 경계에 따라 **`/gallery`도 클라이언트 페이지**(TanStack Query + `authFetch`)로 구현한다.

- 라우트는 `(site)` 그룹에 두어 네비/푸터 셸을 공유한다(`mypage`와 동일 위치).
  - `src/app/(site)/gallery/page.tsx` — 목록
  - `src/app/(site)/gallery/albums/[id]/page.tsx` — 상세
- 두 `page.tsx`는 **서버 셸**(페이지 헤더 + `metadata.title`)일 뿐이며, 실제 데이터 호출은 그 내부의 클라이언트 컴포넌트가 담당한다.
- 공개 목록(설교)이 쓰는 `getSermons` 같은 서버 fetch 헬퍼는 갤러리에 쓰지 않는다 — 토큰이 필요하므로 `authFetch` 경유 클라이언트 페치만 사용.

---

## 2. 게이팅 (이슈 §1 — 최우선) — `GalleryGate`

목록·상세를 **공통으로 감싸는** 게이트 컴포넌트. `useMe()` + `usePermission("GALLERY_VIEW")`로 상태를 분기하고, **권한이 없으면 자식(실제 API 호출 컴포넌트)을 마운트하지 않는다** → "권한 없으면 호출 없이 안내"를 구조적으로 보장한다.

분기는 **반드시 아래 순서**로 평가한다 — `useMe`는 `enabled:!!accessToken`이라 **비로그인 시 쿼리가 발화하지 않아 `isPending`이 영구 true**다. `isPending`을 먼저 검사하면 비로그인 사용자에게 Skeleton이 영구 노출되므로, `!accessToken`을 `isPending`보다 **먼저** 본다.

| 순위 | 상태 | 조건 | 표시 |
|---|---|---|---|
| 1 | 비로그인 | `!accessToken` (`useAuthStore`) — `useMe` 미발화 | "로그인 후 이용 가능" + 로그인 CTA |
| 2 | 로딩 | `isPending` (토큰 있고 me 로딩 중) | Skeleton |
| 3 | 에러 | `isError` | "다시 시도" |
| 4 | 권한 없음(USER) | me 로드됨 + `GALLERY_VIEW` 미보유 | "교인 승인 후 이용 가능" 안내(로그인 CTA 없음) |
| 5 | 통과 | `GALLERY_VIEW` 보유 | `children` 렌더 |

- 게이트가 자식 마운트를 통제하므로, 하위 앨범 쿼리는 **권한 확인 이후에만 발화**한다(403 왕복 0회).
- 로그인 CTA 경로는 기존 패턴과 동일하게 `/login?next=${encodeURIComponent(sanitizeNext(pathname))}`(`@/lib/auth/nextParam` 재사용, `usePathname()` 기준). 필터·페이지 쿼리는 복귀에 보존하지 않는다(경로만, 단순화).
- **방어선:** 만약 앨범 쿼리가 그래도 403 `ACCESS_DENIED`로 실패하면(권한 변동 등) 권한 없음 안내로 폴백한다.
- 가이드 2.4 매핑: 비로그인 직접 호출 = 401 `INVALID_TOKEN`, 로그인+권한없음 = 403 `ACCESS_DENIED`. 게이트로 선판단하므로 정상 흐름에선 둘 다 발생하지 않는다.

---

## 3. 데이터 계층

### 3.1 `src/lib/api/gallery.ts` — 타입 + 순수 페처

OpenAPI 스키마와 1:1 타입. **nullable 표기 근거:** OpenAPI 갤러리 스키마는 `required`·`nullable` 표기가 전무하다(Springdoc 기본 — 전 필드 암묵적 optional). 아래 `| null` 구분은 OpenAPI가 아니라 **도메인 규약(가이드)·기존 `src/lib/api/types.ts` 하우스 컨벤션** 기반 해석이다(예: `author`는 설교·공지·갤러리·주보에만 존재 — 가이드 6.5).

```ts
// GalleryAlbumCardResponse
interface GalleryAlbumCard {
  id: number;
  title: string;
  thumbnailMediaId: number | null; // 첫 사진, 없으면 null → 플레이스홀더
  photoCount: number;
  createdAt: string;               // LocalDateTime(offset 없음)
  tags: TagResponse[];
  author: string | null;
}
// GalleryAlbumDetailResponse
interface GalleryAlbumDetail {
  id: number;
  title: string;
  description: string | null;      // raw 마크다운
  tags: TagResponse[];
  author: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;                 // 조회 전용이라 표시·전송 안 함(미사용 보존)
  photos: GalleryPhoto[];
}
// GalleryPhotoResponse
interface GalleryPhoto {
  id: number;
  mediaId: number;                 // /api/media/{mediaId} 서빙
  caption: string | null;
  sortOrder: number;
}
```

페처(`authFetch` → `parseJson<T>`):

- `fetchAlbums({ page, tagId }): Promise<Page<GalleryAlbumCard>>`
  - 쿼리스트링은 기존 `buildListQuery({ page, size: GALLERY_PAGE_SIZE, sort: "createdAt,desc", tagId })`(`src/lib/page.ts`) 재사용 — 수기 조립 금지. `tagId` undefined면 자동 생략.
  - 경로: `GET /api/gallery/albums${buildListQuery(...)}`.
- `fetchAlbum(id): Promise<GalleryAlbumDetail>` — `GET /api/gallery/albums/{id}`.
- 상수 `GALLERY_PAGE_SIZE = 12`(3열 × 4행) — 컴포넌트 인라인 금지, 모듈 상수로 노출.

> `Page<T>`/`PageMeta`(`{size,number,totalElements,totalPages}`)·`buildListQuery`는 기존 `src/lib/page.ts` 재사용(OpenAPI `PagedModelGalleryAlbumCardResponse`·`Pageable`과 일치 확인). `TagResponse`는 기존 타입 재사용. **`/api/gallery/**`는 `GALLERY_VIEW` 필요(회원전용)** 이므로 페처는 반드시 `authFetch` 경유.

### 3.2 `src/components/gallery/queries.ts` — TanStack Query 훅

- `useAlbums({ page, tagId })` — `queryKey: ["albums", { page, tagId }]`, `queryFn: () => fetchAlbums(...)`, `retry: false`.
- `useAlbum(id)` — `queryKey: ["album", id]`, `retry: false`.
- `useGalleryTags()` — `queryKey: ["tags"]`, `queryFn: getTags`(**기존 `src/lib/api/tags.ts`의 공개 fetch 재사용** — `/api/tags`는 공개이므로 `authFetch`로 토큰을 부착하지 않는다, 가이드 2.3·6.1), `retry: false`. `TagFilter`에 주입.
- 모든 쿼리는 게이트 통과 후 마운트되므로 별도 `enabled` 게이팅은 불필요(게이트가 통제). 방어적 `enabled`는 추가하지 않아 단순화.

> **"공개"의 단일 진실:** `/api/tags`·`/api/media/{id}`는 OpenAPI 전역 `security:[{bearerAuth:[]}]`에도 불구하고 **가이드 2.3 인가 3분법·6.1에 따라 공개**다(OpenAPI엔 operation-level public override가 없음 — 보안 예외의 출처는 가이드). `/api/gallery/**`만 회원전용.

---

## 4. 컴포넌트 (작은 파일·고응집 — `src/components/gallery/`)

- **`AlbumList.tsx`** (client) — `useSearchParams()`로 `page`(0-base)·`tagId` 파싱 → `useAlbums`에 주입. `TagFilter`(태그=`useGalleryTags`) + 앨범 그리드(`sm:grid-cols-2 lg:grid-cols-3`) + `Pagination`(`page.totalPages > 1`일 때). 상태: 로딩=`AlbumCardSkeleton` 그리드, 빈 배열=`EmptyState("등록된 앨범이 없습니다.")`, 에러=재시도 버튼.
- **`AlbumCard.tsx`** — `DepartmentCard` 패턴 미러: `Link`(→`/gallery/albums/{id}`, `focusRing`) + `Card bordered interactive` + aspect-video 썸네일 + 제목(`typo.titleMd`, `text-ink`) + 메타행(작성일 `formatDate(createdAt)` + `typo.datetime` · `사진 N장` · `author` `text-muted`; author null이면 생략) + 태그 `Badge`(상위 몇 개). 호버 시 `sermon-card` 줌(`group-hover:scale-[1.03]`).
  - 썸네일: `thumbnailMediaId`가 있으면 `apiUrl('/api/media/{thumbnailMediaId}')`, **`null`이면 플레이스홀더** = `aspect-video bg-surface-strong` 중앙에 lucide `ImageOff`(size 32, `text-muted`). 토큰만 사용(신규 색 도입 없음). 새 명명 컴포넌트가 아니라 카드 썸네일의 폴백 분기다.
- **`AlbumCardSkeleton.tsx`** — 카드 골격(`Skeleton` 썸네일 + 2줄). 그리드 개수만큼 반복.
- **`AlbumDetail.tsx`** (client) — `useAlbum(id)` → 목록 링크(`← 갤러리`) + 제목(`typo.displaySm`/`titleLg`) + 메타(`formatDate(createdAt)`·사진 수·author) + 태그 Badge(링크 `/gallery?tagId=`) + 헤어라인 + (description 있을 때만 삼항으로) `<MarkdownContent source={description} />` + `PhotoGrid`. 로딩=Skeleton, 에러/404=안내. (`MarkdownContent`의 prop명은 `source` — `description`이 null/빈값이면 컴포넌트 자체를 렌더하지 않음.)
- **`PhotoGrid.tsx`** — 균일 **aspect-square** 썸네일 그리드(`button`, `2~4열 반응형`). 각 사진 `apiUrl('/api/media/{mediaId}')`. 열린 사진 `index` 상태(`number | null`) 관리, `PhotoLightbox` 렌더. 사진 0장이면 EmptyState. (균일 정사각 크롭 — 마소너리보다 단순하고 정렬 안정)
- **`PhotoLightbox.tsx`** — `ui/dialog.tsx`의 `Dialog`/`DialogContent`/`DialogTitle` 재사용. `open = index !== null`, `onOpenChange`로 닫기.
  - **폭:** `DialogContent` base는 `max-w-[var(--container-modal)]`(32rem)이라 사진엔 좁다 → **신규 토큰 `--container-lightbox`**(globals.css `@theme`에 추가, 예: 64rem)를 만들고 `className="max-w-[var(--container-lightbox)]"`로 덮어쓴다(arbitrary px 금지 — 토큰 경유). DESIGN.md에 `--container-lightbox` 항목을 등재한 뒤 사용.
  - **표면:** `DialogContent`의 카드 표면(`bg-surface-card p-xl`)을 유지한다 → 이미지가 흰 카드 안에 놓이므로 **내장 X 닫기 버튼(`text-muted hover:text-ink`)이 그대로 가시적**이다(별도 on-dark 오버라이드 불필요). 풀블리드 다크 라이트박스는 DESIGN.md 예외(hero/auth) 밖이라 채택하지 않는다.
  - **내용:** 큰 이미지 + caption(있으면, `typo.caption text-muted`) + 카운터("N / M", `typo.datetime`) + ◀/▶ 버튼(`lucide` ChevronLeft/Right, 좌우 가장자리 수직중앙). 내장 X(우상단)는 닫기, ◀/▶는 이전/다음 — 위치가 겹치지 않게 배치.
  - **키보드:** ←/→ 이동은 `DialogContent` `onKeyDown`. ESC·포커스 트랩·오버레이 클릭·스크롤 잠금·포커스 복귀는 Radix Dialog 제공(재스킨으로 깨뜨리지 않음).
  - **a11y:** visually-hidden `DialogTitle`("앨범명 사진 N / M") 유지(가이드 15.2). 인덱스 경계(처음/끝)에서 prev/next 비활성(비순환, 단순화).

> 색·간격·라운드·타이포는 전부 DESIGN.md 토큰/`typo.*`. arbitrary hex/px 금지. 아이콘은 `lucide-react` only. 조건부 렌더는 삼항(`cond ? <X/> : null`).

---

## 5. 라우팅 조립

- **목록** `src/app/(site)/gallery/page.tsx` (server):
  - `export const metadata = { title: "갤러리" }`.
  - 페이지 헤더(`<Container>` + h1 "갤러리") + `<Suspense fallback={…}><GalleryListClient/></Suspense>`.
  - `GalleryListClient` = `<GalleryGate><AlbumList/></GalleryGate>` (client). `AlbumList`의 `useSearchParams` 때문에 Suspense 경계 필요(기존 `Pagination`/`TagFilter` 패턴과 동일).
- **상세** `src/app/(site)/gallery/albums/[id]/page.tsx` (server):
  - `const { id } = await params; const numId = Number(id);` → `if (!Number.isInteger(numId) || numId <= 0) notFound();`(기존 `sermons/[id]` 패턴).
  - 헤더 + `<GalleryGate><AlbumDetail id={numId}/></GalleryGate>`.
- 게이트를 **양쪽에 공통 적용**해 목록·상세 모두 권한 없으면 호출 없이 안내된다.

---

## 6. 에러 처리

- 모든 쿼리는 `parseJson`이 비-2xx를 `ApiError(errorCode)`로 던짐(가이드 4장).
- **401 `INVALID_TOKEN`**: `authFetch`가 refresh 선처리, 실패 시 `forceLogout`(토큰 소멸) → 게이트가 비로그인 상태로 자연 전환.
- **403 `ACCESS_DENIED`**: 게이트 선판단으로 정상 흐름엔 없음. 발생 시 권한 없음 안내로 폴백.
- **404**(상세): 존재하지 않는 앨범 → "앨범을 찾을 수 없습니다" 안내(또는 `notFound`).
- 출력 채널은 **페이지 레벨 인라인 상태 UI**(Toast 아님 — Toast는 폼 액션용).

---

## 7. 테스트 (TDD, 커버리지 80%+)

RED→GREEN→REFACTOR. 파일별:

- `gallery.test.ts` — `fetchAlbums` 쿼리스트링 조립(page·size·sort·tagId 유무), `fetchAlbum` 경로, 응답 파싱(authFetch/parseJson mock).
- `GalleryGate.test.tsx` — 5상태(비로그인/로딩/에러/권한없음/통과) 렌더 분기 + **분기 우선순위**(비로그인 시 `isPending`이 true여도 Skeleton이 아니라 로그인 안내) 검증(useMe·useAuthStore mock).
- `AlbumCard.test.tsx` — 썸네일 URL vs 플레이스홀더(null), href, 메타(작성일·사진 수·author 생략), 태그 Badge.
- `AlbumList.test.tsx` — 로딩/빈/에러/목록, `tagId`·`page` searchParams 반영, Pagination 노출 조건.
- `PhotoGrid.test.tsx` — 클릭 시 라이트박스 열림, 사진 0장 EmptyState.
- `PhotoLightbox.test.tsx` — prev/next 이동, ←/→ 키, caption 표시, 경계 비활성, 카운터.
- `AlbumDetail.test.tsx` — 마크다운 description 렌더 + 사진 그리드, description 빈값 생략, 404 안내.

검수 게이트 = 이슈 §5·§6 완료/검수 조건 전부.

---

## 8. 재사용 자산 (기존 코드 — 검증 완료)

| 자산 | 경로 | 용도 |
|---|---|---|
| `authFetch` | `src/lib/auth/authFetch.ts` | 토큰 부착 + 401 refresh |
| `parseJson`/`ApiError` | `src/lib/auth/apiError.ts` | 응답 파싱·에러 |
| `useMe`/`usePermission` | `src/lib/auth/useMe.ts` | 라이브 권한 |
| `hasPermission` | `src/lib/auth/permissions.ts` | 권한 판정 |
| `useAuthStore` | `src/lib/auth/authStore.ts` | accessToken |
| `apiUrl` | `src/lib/auth/apiBase.ts` | `/api/media/{id}` URL |
| `Page`/`PageMeta`/`buildListQuery` | `src/lib/page.ts` | 페이지 봉투·쿼리스트링 조립 |
| `getTags` | `src/lib/api/tags.ts` | 공개 태그 목록(plain fetch) |
| `formatDate`/`parseServerDate` | `src/lib/date.ts` | `createdAt`(LocalDateTime) KST 표기 |
| `sanitizeNext` | `src/lib/auth/nextParam.ts` | 로그인 `?next=` 인코딩 |
| `Pagination` | `src/components/common/Pagination.tsx` | `?page=` 동기화 |
| `TagFilter` | `src/components/common/TagFilter.tsx` | `?tagId=` 동기화(`tags` prop 주입) |
| `MarkdownContent` | `src/components/common/MarkdownContent.tsx` | description 렌더(prop명 `source`) |
| `Card`/`Badge` | `src/components/ui/` | 카드·배지 |
| `dialog.tsx` | `src/components/ui/dialog.tsx` | 라이트박스(Radix, 내장 X 닫기 포함) |
| `Skeleton`/`EmptyState` | `src/components/common/` | 로딩·빈 |
| `DepartmentCard`/`SermonCard` | `src/components/{departments,cards}/` | 앨범 카드 패턴 |
| `typo.*` | `src/constants/typography.ts` | 타이포 토큰 |
| `permissionLabel` | `src/constants/permissions.ts` | `GALLERY_VIEW` 한글 라벨 |

**신규 토큰:** `--container-lightbox`(globals.css `@theme`, DESIGN.md 등재) — 라이트박스 폭(예: 64rem).

**신규 파일:** `src/lib/api/gallery.ts`, `src/components/gallery/{queries,AlbumList,AlbumCard,AlbumCardSkeleton,AlbumDetail,PhotoGrid,PhotoLightbox,GalleryGate}.tsx`, `src/app/(site)/gallery/{page.tsx, albums/[id]/page.tsx}`. (테스트는 각 `.test.tsx`/`.test.ts` 병행 — 기존 **vitest + @testing-library/react** 컨벤션.)

---

## 9. 완료 조건 (이슈 §5·§6)

- [ ] 게이팅: `GALLERY_VIEW` 없으면 호출 없이 안내(비로그인·USER 모두).
- [ ] 목록 `/gallery`: 앨범 카드(thumbnail·photoCount·tags·author), `createdAt,desc` 정렬·`tagId` 필터, Pagination.
- [ ] 상세 `/gallery/albums/{id}`: 사진 그리드 + description 마크다운 + 라이트박스(←/→·ESC·caption).
- [ ] TanStack Query + `authFetch` 경유.
- [ ] 권한 보유 회원 목록/상세 정상 조회, 401 refresh 선처리, 403 안내.
- [ ] `pnpm test`/`pnpm lint`/`pnpm build` 통과, 커버리지 80%+.
