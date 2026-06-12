# 설교 페이지 설계 스펙 — T10 (목록·검색·상세)

> 2026-06-12 브레인스토밍 확정본. 선행 T6(공통 유틸·컴포넌트)·T7(앱 셸) 완료 기준.
> 이슈: `.issues/T10-sermons.md` · 가이드 10·3·5·7장 · OpenAPI `/api/sermons`.
> 비주얼 컴패니언으로 필터 UX·상세 레이아웃을 검증해 아래 D1·D6을 확정했다.

설교 **목록 `/sermons`**(검색·태그필터·페이지네이션)와 **상세 `/sermons/[id]`**(영상·메타·마크다운 본문)를
공개 **서버 컴포넌트**로 구현한다. 기존 "after" 프로덕션 컴포넌트(SermonCard·Input·Badge·Pagination·
TagFilter·EmptyState·MarkdownContent)를 조립하고, 신규는 데이터 계층과 설교 전용 4개 컴포넌트만 만든다.

## 1. 확정 결정

| # | 결정 | 내용 · 근거 |
|---|---|---|
| D1 | 필터 UX = **미니멀 + 클릭 구동** (A안) | 백엔드가 설교자/시리즈 **선택 목록 API를 주지 않음** → 자유입력 폼 대신 **검색창(q) + 태그필 + 활성칩**만 상시 노출. 설교자·시리즈·태그 **완전일치** 필터는 **상세 페이지에서 클릭**으로 확보. 주 사용자층(고령) + "여백 호흡" 톤에 정합 |
| D2 | 라우트 = `src/app/(site)/sermons/` (**그룹 안**) | 히어로 없는 표준 서브페이지 → `(site)` SiteShell(라이트 헤더+CtaBand+푸터) 자동 적용. 페이지는 `<Container>` 본문만 렌더. 네비에 `설교→/sermons` 링크 이미 존재(수정 없음) |
| D3 | 데이터 경계 = 서버 컴포넌트 fetch (15.1) | 공개 도메인 → TanStack Query 미사용. 목록·상세 모두 서버에서 fetch. 신규 `lib/api/sermons.ts`·`lib/api/tags.ts` |
| D4 | 캐싱 = 목록 `revalidate:60` · 상세 `no-store` | 상세는 GET마다 조회수+1(부수효과, 백엔드 답변 C) → 매 요청 백엔드 도달 필요. 목록은 캐시 가능 |
| D5 | 동적 렌더 → `connection()` 불필요 | 목록은 `searchParams` 접근으로, 상세는 `no-store`로 이미 **동적**. CI(백엔드 없음) 빌드가 prerender를 시도하지 않음 → [[next16-connection-vs-force-dynamic]]의 force-dynamic 이슈와 무관. 구현 시 `pnpm build`로 검증 |
| D6 | 상세 레이아웃 = **영상 우선** (A안) | 영상을 본문 위 최상단 16:9로. "사진/영상이 주인공" 디자인 톤과 직결. 영상 없으면 영역 생략 → 텍스트 흐름 자연 유지 |
| D7 | 영상 = **유튜브 facade**, 그 외 링크 폴백 | 유튜브(watch·youtu.be·embed)면 **썸네일(`img.youtube.com/vi/{id}/hqdefault.jpg`) + ▶**를 가볍게 띄우고, **클릭 시에만** `iframe?autoplay=1` 로드(무거운 YT 스크립트 지연 → 고령자 기기·느린 망 대응). 비유튜브 URL은 **"영상 보기" 링크 버튼** |
| D8 | 오디오 = 음원 파일 플레이어 / 링크 | `audioUrl`이 직접 음원(`.mp3/.m4a/.aac/.ogg/.wav`)이면 `<audio controls>`, 아니면 "오디오 듣기" 링크. **선택 필드 — 없으면 생략** |
| D9 | 클릭 구동의 위치 = **상세에서만** | 목록 카드는 상세로 가는 단일 Link 유지(카드 안에 필터 Link 중첩 = `<a>` in `<a>` 회피). 설교자·시리즈·태그 클릭 필터는 상세 페이지에 둠 |

## 2. 파일 구조

```
신규
├─ src/app/(site)/sermons/page.tsx               # (server) 목록 — searchParams 파싱 + 병렬 fetch + 조립
├─ src/app/(site)/sermons/page.test.tsx
├─ src/app/(site)/sermons/[id]/page.tsx          # (server) 상세 — getSermon + notFound + 영상우선 레이아웃
├─ src/app/(site)/sermons/[id]/page.test.tsx
├─ src/lib/api/sermons.ts                         # getSermons · getSermon · buildSermonQuery · SermonListParams
├─ src/lib/api/sermons.test.ts
├─ src/lib/api/tags.ts                            # getTags (GET /api/tags, revalidate 300)
├─ src/lib/api/tags.test.ts
├─ src/lib/youtube.ts                             # parseYouTubeId(url) 순수 함수
├─ src/lib/youtube.test.ts
├─ src/components/sermons/SermonSearch.tsx        # (client) searchPill 검색 인풋 — q URL 동기화
├─ src/components/sermons/SermonSearch.test.tsx
├─ src/components/sermons/ActiveFilters.tsx       # (client) q·preacher·series·기간 활성칩 + ✕제거
├─ src/components/sermons/ActiveFilters.test.tsx
├─ src/components/sermons/SermonVideo.tsx         # (client) 유튜브 facade ↔ iframe / 링크 폴백
├─ src/components/sermons/SermonVideo.test.tsx
├─ src/components/sermons/SermonAudio.tsx         # (server) 음원 플레이어 / 링크
└─ src/components/sermons/SermonAudio.test.tsx

편집
└─ src/lib/api/types.ts                           # + SermonDetailResponse

재사용 (변경 없음)
   SermonCard · TagFilter · Pagination · EmptyState · MarkdownContent ·
   Input(searchPill) · Badge · Button · Container · lib/date(formatDate) · lib/page(Page<T>)
```

## 3. 데이터 계층

### 3.1 타입 (`lib/api/types.ts` 편집)
`SermonCardResponse`(기존 재사용)에 더해 상세 타입 추가:
```ts
export interface SermonDetailResponse {
  id: number; title: string; preacher: string;
  series?: string | null; scripture?: string | null;
  content: string;                     // raw 마크다운
  videoUrl?: string | null; audioUrl?: string | null;  // 외부 링크(선택)
  preachedAt: string;                  // date (yyyy-MM-dd)
  viewCount: number;
  createdAt: string; updatedAt: string; // LocalDateTime
  version: number;
  tags: TagResponse[];
  author?: string | null;              // 서버 마스킹 적용(마지막 편집자)
}
```

### 3.2 `lib/api/sermons.ts`
```ts
export interface SermonListParams {
  page?: number; size?: number; sort?: string;   // 기본 정렬 preachedAt,desc (백엔드 기본 — 미지정 시 생략)
  tagId?: number; q?: string;
  preacher?: string; series?: string;             // 완전일치
  from?: string; to?: string;                     // yyyy-MM-dd, 상한 포함
}
buildSermonQuery(p): string   // undefined·"" 생략, encodeURIComponent. 공유 buildListQuery는 손대지 않음
getSermons(p): Promise<Page<SermonCardResponse>>  // fetch(apiUrl('/api/sermons'+q), { next:{ revalidate:60 } }); !ok→throw
getSermon(id): Promise<SermonDetailResponse|null> // fetch(.../{id}, { cache:'no-store' }); 404→null; 그 외 !ok→throw
```

### 3.3 `lib/api/tags.ts`
```ts
getTags(): Promise<TagResponse[]>  // fetch(apiUrl('/api/tags'), { next:{ revalidate:300 } }); 비페이징 평배열; !ok→throw
```

### 3.4 `lib/youtube.ts`
```ts
parseYouTubeId(url: string): string | null
// youtube.com/watch?v=ID · youtu.be/ID · youtube.com/embed/ID → ID, 그 외 null
```

## 4. 목록 페이지 `/sermons`

서버 컴포넌트. **이 Next 버전은 `searchParams`가 Promise** → `await`.
1. `const sp = await searchParams` → `SermonListParams`로 정규화. `page`/`size`/`tagId`는 `Number()` 후 `Number.isFinite` 방어(실패 시 기본값), 문자열 필터는 trim 후 빈 값 제거.
2. `const [data, tags] = await Promise.all([getSermons(params), getTags()])` — 병렬.
3. 렌더 (`<Container as="section" className="py-section">`):
   - `<h1 className={cn(typo.displayMd, "text-ink")}>설교</h1>`
   - `<SermonSearch />` — placeholder **"제목·설교자·시리즈·성경구절"** (이슈 §1: OpenAPI의 "제목/내용"은 오기)
   - `<TagFilter tags={tags} />`
   - `<ActiveFilters />` — q·preacher·series·기간 칩(있을 때만). tagId는 TagFilter가 이미 표시 → 제외
   - 결과: `data.content.length === 0` → `<EmptyState message="조건에 맞는 설교가 없습니다." />`
     아니면 `grid gap-base sm:grid-cols-2 lg:grid-cols-3` 안에 `SermonCard`
     (`href={/sermons/${id}}`, `date={formatDate(preachedAt)}`, `series`·`scripture`,
      `tags={s.tags.map(t=>t.name)}`; 썸네일 없음 = 텍스트형, 스펙 D1)
   - `<Pagination page={data.page} />`

### 4.1 `SermonSearch` (client)
`"use client"` + `<Suspense>` 경계(useSearchParams, TagFilter 패턴 동일). searchPill `Input`,
`defaultValue=searchParams.get("q")`. 제출(Enter/검색버튼): 기존 쿼리 보존한 `URLSearchParams`에서
`q` set/delete + `page` delete → `router.push`. `q` 있으면 ✕(clear) 노출.

### 4.2 `ActiveFilters` (client)
`"use client"` + Suspense. `searchParams`에서 `q`·`preacher`·`series`와 `from`/`to` 쌍을 읽어
제거 가능한 칩 렌더. 각 ✕ = 해당 param + `page` 만 drop(나머지 보존)한 href.
라벨: `검색: "은혜"` · `설교자: 김목사` · `시리즈: 여름` · `기간: 2026-01-01 ~ 2026-03-31`.

## 5. 상세 페이지 `/sermons/[id]` (영상 우선)

서버 컴포넌트. `const { id } = await params` → 숫자 검증 → `getSermon(Number(id))` → `null`이면 `notFound()`.
`<Container as="section" className="py-section">` 안:
1. `◀ 설교 목록` Link → `/sermons`
2. `videoUrl` → `<SermonVideo url={videoUrl} title={title} />` (없으면 생략)
3. 제목 `typo.titleLg`/`displayMd`
4. 메타 라인(`typo.datetime`/muted): **설교자**(Link→`/sermons?preacher={preacher}`) · `formatDate(preachedAt)` · 조회수 · 작성자(있으면, 서버 마스킹 그대로, muted)
5. 성경구절 · **시리즈**(Link→`/sermons?series={series}`) — 있는 것만
6. 태그: 각 `<Badge>`를 `<Link href={/sermons?tagId={t.id}}>`로 감쌈
7. `audioUrl` → `<SermonAudio url={audioUrl} />` (없으면 생략)
8. 구분선 → `<MarkdownContent source={content} />`

### 5.1 `SermonVideo` (client)
`parseYouTubeId(url)` → id 있으면 **facade**: `aspect-video rounded-xl overflow-hidden` 안에
썸네일 `img.youtube.com/vi/{id}/hqdefault.jpg` + 중앙 ▶ 버튼. `useState`로 클릭 시
`<iframe src="https://www.youtube.com/embed/{id}?autoplay=1" allow="...; autoplay" allowFullScreen>` 교체.
id 없으면 `<a target="_blank" rel="noopener noreferrer">` "영상 보기" 버튼(Button variant).

### 5.2 `SermonAudio` (server)
URL이 음원 확장자(`.mp3/.m4a/.aac/.ogg/.wav`, 쿼리스트링 무시)면 `<audio controls preload="none" src=...>`,
아니면 "오디오 듣기" 외부 링크. (네이티브 audio는 상호작용 JS 불필요 → 서버 컴포넌트)

## 6. 에러 · 엣지

- 목록 fetch 실패 → throw → 루트 `error.tsx` 위임.
- 상세 404 → `notFound()` → `not-found.tsx`. id가 비숫자 → 동일 처리.
- 빈 목록 → `EmptyState`.
- 잘못된 page/tagId(NaN) → 기본값 정규화(방어).
- `author` null/마스킹("(탈퇴한 사용자)"·"(알 수 없음)") → 서버 값 **그대로** 표기(7장).
- 본문 `media:{id}` → `MarkdownContent`가 `/api/media/{id}` 치환 + DOMPurify(5장).
- `preachedAt`은 **date(시간 없음)** → `formatDate`로 날짜만, datetime 토큰(tnum).

## 7. 테스트 (TDD, 80%+ — RED→GREEN→REFACTOR)

| 파일 | 검증 |
|---|---|
| `youtube.test.ts` | watch?v=·youtu.be·/embed/ → id, 비유튜브·빈문자 → null |
| `sermons.test.ts` | `buildSermonQuery`(필드 생략·인코딩·정렬 기본), `getSermons`(revalidate, 봉투), `getSermon`(no-store, 404→null, 5xx→throw) |
| `tags.test.ts` | 평배열 반환, !ok throw |
| `SermonSearch.test.tsx` | q 제출 → push 쿼리에 q set·page 삭제, 기존 tagId 보존, clear |
| `ActiveFilters.test.tsx` | 활성 칩 렌더 조건, ✕ href가 해당 param+page만 제거 |
| `SermonVideo.test.tsx` | 유튜브 → 썸네일+버튼, 클릭 → iframe; 비유튜브 → 링크 |
| `SermonAudio.test.tsx` | 음원 확장자 → audio, 그 외 → 링크 |
| `sermons/page.test.tsx` | searchParams 파싱 → getSermons 인자, 빈 목록 EmptyState, 카드 href·날짜 |
| `sermons/[id]/page.test.tsx` | getSermon 호출, null→notFound, 클릭 메타 href, video/audio 조건부 렌더, author 그대로 |

### 7.1 검수 게이트 (이슈 §5)
- [ ] 목록 필터/정렬/페이지가 **URL 쿼리와 동기화**.
- [ ] 상세 진입 시 **매번 백엔드 호출**(no-store).
- [ ] 본문 마크다운·`media:{id}` 이미지 렌더 + 새니타이즈.
- [ ] author 마스킹을 **서버 값 그대로** 표기.

## 8. 범위 밖 (YAGNI)

- 정렬 UI(드롭다운) — 기본 `preachedAt,desc` 고정. 필요 시 후속.
- 설교자/시리즈/기간 **자유입력 폼** — A안에서 제외(클릭 구동으로 대체).
- 비메오 임베드 — 링크 폴백으로 충분(대다수 유튜브 가정).
- 어드민 설교 CUD(`/api/admin/sermons`) — T10 범위 아님(공개 조회만).
