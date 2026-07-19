# 설교 회원전용 전환 — 프론트 설계

- 날짜: 2026-07-20
- 목표: 설교 목록·상세를 갤러리와 동일한 **회원전용**(교인 승인 `MEMBER` 이상)으로 전환.
- 백엔드 선행 완료: `SERMON_VIEW` 신설(V15, `SUPER_ADMIN`·`ADMIN`·`MEMBER` 시드),
  `GET /api/sermons`·`GET /api/sermons/{id}` = 인증 + `SERMON_VIEW` 필요
  (401 `INVALID_TOKEN` / 403 `ACCESS_DENIED`, 갤러리와 동일 시맨틱). `docs/api-docs.json` 교체 반영됨.

## 1. 아키텍처 결정

- 설교는 공개 영역(RSC fetch + ISR)에서 **회원 영역(클라 TanStack Query + `authFetch`)** 으로 이동
  (가이드 15.1 데이터 패칭 경계). STATELESS 토큰이 클라에만 있어 RSC 인증 fetch 불가 — 서버측 게이트 대안 없음.
- 게이트는 `GalleryGate`를 공용 `MemberGate`로 일반화(소비자 2개 시점의 추출). 갤러리 구현을 미러링한다.
- 영향: 설교가 검색엔진·비로그인 공유 링크에서 사라진다(의도된 결과).
- **메인 '최신 설교 3' 섹션은 티저로 유지(결정됨)**: `GET /api/main`은 공개 유지(메타만 — 제목·설교자·날짜,
  본문 없음), 클릭 시 상세는 게이트가 로그인으로 유도. 메인 페이지·`main.ts` 무수정
  (`main.ts`는 태그 없이 시간 revalidate 60 — `revalidateSermons` 제거와 무관).

## 2. 게이트 — `MemberGate` 공용 추출

신규 `src/components/common/MemberGate.tsx`:

- `GalleryGate`의 로직·분기 순서 그대로 이동:
  ① `useHasHydrated()` 전 → 스켈레톤(첫 페인트 로그인 안내 깜빡임 방지)
  ② `!accessToken` → 로그인 안내 + `/login?next=` 링크(`sanitizeNext`)
  ③ `useMe` isPending → 스켈레톤 (※ `!accessToken`을 isPending보다 먼저 — enabled 게이팅 주석 보존)
  ④ isError → 재시도 안내
  ⑤ `hasPermission(permission, me)` 실패 → 교인 승인 안내
  ⑥ 통과 → children (게이트 미통과 시 children 미마운트 = API 호출 0회)
- Props: `permission: string`, `domainLabel: string`(안내 문구의 "갤러리"/"설교" 자리),
  `skeleton?: ReactNode`(기본값 = 기존 그리드 스켈레톤, testid는 `member-gate-skeleton`으로 개명).
- 안내 문구는 기존 갤러리 문구에서 도메인 단어만 치환:
  "『domainLabel』는(은) 교인 전용입니다. 로그인해 주세요." / "『domainLabel』 열람은 교인 승인(MEMBER) 후 가능합니다. 교회로 문의해 주세요."
- 갤러리 호출부 4곳(`gallery/page.tsx`, `albums/new/page.tsx`, `albums/[id]/page.tsx`,
  `albums/[id]/edit/page.tsx`)은 `<MemberGate permission="GALLERY_VIEW" domainLabel="갤러리">`로 교체.
- **삭제(승인됨)**: `GalleryGate.tsx`. `GalleryGate.test.tsx`는 `MemberGate.test.tsx`로 이전·확장.

## 3. API·쿼리 계층

`src/lib/api/sermons.ts`:

- `getSermons`/`getSermon`(서버 fetch·ISR·no-store) 제거 → `fetchSermons(params)`/`fetchSermon(id)`
  (`authFetch` + `parseJson`, `gallery.ts` 동형). 404 특수 처리 없음(갤러리 관례 — 클라에서 에러 안내).
- `buildSermonQuery`·`SermonListParams`·admin 타입 re-export 유지.

신규 `src/components/sermons/queries.ts` (`gallery/queries.ts` 동형):

- `useSermons(params)` — queryKey `["sermons", params]`, `keepPreviousData`, `retry: false`
  (401 refresh는 authFetch가 처리 — 이중 재시도 방지 주석 보존).
- `useSermon(id)` — `["sermon", id]`, `retry: false`.
- 태그는 공개 `getTags` 재사용(`["tags"]` 키 공유, 토큰 미부착).
- 게이트 통과 후에만 마운트되므로 `enabled` 게이팅 불필요.

## 4. 페이지 전환 (RSC 셸 + 클라 island)

### 4.1 목록 `/sermons/page.tsx`

- RSC 셸: 제목 행(h1 + `SermonListAction`) + `Suspense` + `MemberGate` + `SermonList`.
- 신규 `src/components/sermons/SermonList.tsx`(클라): `useSearchParams`로
  `page·tagId·q·preacher·series·from·to` 파싱 — 기존 `parseParams`의 toStr/toNum/toDate 검증 로직을
  `string | null` 시그니처로 이동(yyyy-MM-dd 정규식 등 방어 유지). `useSermons` 조회.
- 구성: `SermonSearch` + `TagFilter` + `ActiveFilters` + 카드 그리드(`SermonCard`) + `Pagination`(scroll:false).
- 상태: pending=카드 스켈레톤 그리드, error=안내+재시도, empty=`EmptyState`,
  `isPlaceholderData`=그리드 반투명(`aria-busy`) — `AlbumList` 패턴 그대로.
- `SermonSearch`·`TagFilter`·`ActiveFilters`·`Pagination`은 URL만 조작하는 클라 컴포넌트 — **무수정**.

### 4.2 상세 `/sermons/[id]/page.tsx`

- RSC 셸: id 검증(비숫자·0·음수 → `notFound()`) + "설교 목록" 뒤로가기 링크 + `MemberGate` + `SermonDetail`.
- 신규 `src/components/sermons/SermonDetail.tsx`(클라): `useSermon(id)`, 기존 상세 JSX 이동
  (영상 우선 레이아웃·오디오·메타 링크·태그·`MarkdownContent`·`SermonDetailActions`).
- pending=스켈레톤, 에러(404 포함)=안내+재시도 — `AlbumDetail` 관례.

### 4.3 수정 `/sermons/[id]/edit/page.tsx`

- RSC `getSermon` 시드 제거 → `MemberGate` + `RequirePermission("SERMON_WRITE")` +
  신규 `SermonEditLoader`(클라, `AlbumEditLoader` 동형: `useSermon` 시드, keyed 마운트로
  defaultValues 고정 — effect reset 금지 관례).
- `/sermons/new`는 읽기 API 없음 — 무수정(확인됨).

## 5. ISR 철거

- `lib/admin/revalidate.ts`에서 `revalidateSermons` 제거 + `revalidate.test.ts` 갱신.
- `SermonForm`·`SermonAdminActions`의 `revalidateSermons()` 호출 제거 →
  mutation 성공 시 `queryClient.invalidateQueries`(`["sermons"]`·`["sermon", id]`) — 갤러리 mutation 관례.
- **삭제(승인됨)**: `sermons/loading.tsx`, `sermons/[id]/loading.tsx` — 서버 fetch가 사라져 무의미.

## 6. 문서 갱신

- `docs/church-frontend-guide.md`: 권한 표에 `SERMON_VIEW` 행 추가, sermon 도메인 표의
  "조회 공개" → "조회 `SERMON_VIEW` 회원전용", 2.3 회원전용 차단 UX에 설교 병기 — 최소 수정.

## 7. 테스트 (TDD, 프론트 테스트 관례 준수)

- `MemberGate.test.tsx`: GalleryGate 테스트 이전 + 도메인 문구/권한 prop 케이스
  (하이드레이션 전 스켈레톤 / 비로그인 로그인 안내 / 권한 없음 승인 안내 / 통과 시 children).
- `sermons/queries.test.tsx`: gallery queries.test 동형.
- `SermonList.test.tsx`: pending/error/empty/성공 상태 — AlbumList.test 동형.
- `SermonDetail.test.tsx`: AlbumDetail.test 동형.
- 기존 갱신: `SermonForm.test`·`SermonAdminActions.test`(revalidate 제거→invalidate),
  `revalidate.test.ts`, 갤러리 페이지 관련 테스트(임포트 교체 영향 확인).
- 게이트: `pnpm lint` + `npx tsc --noEmit` + `pnpm test` 전체 통과.

## 8. 삭제 파일 (사용자 승인됨)

1. `src/components/gallery/GalleryGate.tsx` (→ MemberGate로 대체)
2. `src/app/(site)/sermons/loading.tsx`
3. `src/app/(site)/sermons/[id]/loading.tsx`
