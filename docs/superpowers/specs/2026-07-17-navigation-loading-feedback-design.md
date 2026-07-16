# 페이지 이동 로딩 피드백 — 공개 페이지 loading.tsx 스켈레톤

- 날짜: 2026-07-17
- 대상: `src/components/common/ListRowsSkeleton.tsx`(신규) · `src/components/common/CardGridSkeleton.tsx`(신규) ·
  `src/components/common/DetailSkeleton.tsx`(신규) · `src/app/(site)/{notices,bulletins,events,sermons}/loading.tsx`(신규) ·
  `src/app/(site)/{notices,events,sermons}/[id]/loading.tsx`(신규)
- 신뢰 소스: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md` ·
  `.claude/rules/DESIGN.md` · `docs/church-frontend-guide.md` 15.1

## 1. 배경 — 문제와 원인

공개 페이지(공지·주보·일정·설교)는 서버 컴포넌트 + ISR(fetch `revalidate: 60 + tags`)로 렌더된다.
그런데 목록 페이지는 `searchParams`를 읽어 **매 이동마다 동적 서버 렌더**이고, 상세 일부는
`no-store`(공지 상세 — 어드민 낙관락 version 시드)다. 서버 왕복 동안 브라우저는 이전 화면을
그대로 유지하며, **`loading.tsx`가 0개**라 사용자는 클릭이 접수됐다는 어떤 신호도 받지 못한다.
도허티 임계(0.4초) 위반 — 특히 주 사용자층(고령 교인)은 "안 눌렸나?" 하고 다시 누른다.

반면 다른 두 지연 유형은 이미 도구가 있다:

| 호출 유형 | 피드백 도구 | 상태 |
|---|---|---|
| 페이지 이동(공개 SSR) | `loading.tsx` | **없음 — 이번 작업** |
| 회원·어드민 조회(TanStack Query) | `isPending` + `Skeleton` | 있음(부분) |
| 폼 제출(mutation) | `Button loading`(스피너+비활성+`aria-busy`) | 완비 |

## 2. 결정 — 네이티브 `loading.tsx` 스켈레톤, 전역 모달 없음

**원칙: 피드백은 "바뀌는 영역"에만 준다. 화면 전체를 막지 않는다.**

- `loading.tsx`의 fallback은 **링크와 함께 프리페치**되어 클릭 즉시 뜬다(서버 속도 무관).
  내비·뒤로가기는 살아 있고, 서버 렌더가 끝나면 실제 내용으로 스트리밍 교체된다(Next 네이티브 Suspense).
- **전역 로딩 모달/오버레이는 채택하지 않는다**: 짧은 이동에도 화면 전체를 잠가 "피드백 없음"을
  "아무것도 못 함"으로 바꾸고, DESIGN.md의 절제 톤과 어긋나며, 서버 렌더 종료 시점을 클라이언트
  모달이 알기 어려워 프레임워크와 싸우게 된다.
- **상단 프로그레스 바(`useLinkStatus`)는 보류**: `loading.tsx`로 부족하다고 확인되면 그때 추가(YAGNI).
- **SSR/CSR 경계·캐싱 정책은 변경 없음**: 공개=SSR+ISR, 회원·어드민=CSR(가이드 15.1 확정).
  공개를 CSR로 바꾸면 SEO 상실 + 저사양 기기에서 더 느려지므로 역방향이다.

전제 확인 완료: `(site)/layout.tsx`·`SiteShell`·루트 layout에 uncached fetch 없음 →
`loading.tsx` fallback이 layout에 막히지 않는다(loading.md "Good to know" 제약 통과).

## 3. 스켈레톤 조각 — `src/components/common/` 3종

기존 `Skeleton`(펄스 박스) 프리미티브를 조합한다. **실물 페이지와 동일한 컨테이너·그리드·간격
클래스를 사용**해 반응형이 저절로 맞고(모바일 1-up/태블릿 2-up/데스크톱 3-up), 스켈레톤→실제
콘텐츠 교체 시 레이아웃 점프(CLS)가 없게 한다. 전부 서버 컴포넌트(훅 없음), `aria-hidden`.

| 컴포넌트 | 형태 | 사용처 |
|---|---|---|
| `ListRowsSkeleton` | 헤어라인 구분 가로 행 반복(제목 줄 + 날짜 줄), `rows` prop(기본 10) | 공지·주보 목록 |
| `CardGridSkeleton` | `sm:grid-cols-2 lg:grid-cols-3` 그리드에 카드꼴(aspect-video 썸네일 + 2줄) 반복, `count` prop(기본 6) | 설교 목록 |
| `DetailSkeleton` | 제목(displayMd 높이) + 메타 1줄 + 본문 문단 줄들 | 공지·설교·일정 상세 |

`AlbumCardSkeleton`(갤러리)은 `Card` 의존이 있어 그대로 두고, `CardGridSkeleton`은 같은 결
(aspect-video + 2줄)로 만들되 공개 페이지 전용으로 둔다. 이미지가 늦게 와도 `aspect-video`
고정 자리라 흔들리지 않는다(카드 이미지는 전부 `next/image` — 최적화·lazy 기존 처리).

## 4. `loading.tsx` 배치 — 대상 세그먼트와 내용

각 `loading.tsx`는 해당 페이지의 상단 구조(Container + `py-section` + h1 자리)를 미러링한
스켈레톤을 렌더한다. 제목 텍스트는 실제 문자열을 그대로 쓴다(공지·주보 등 — 정적 문자열이라
즉시 보여줄 수 있는 "미래 화면의 의미 있는 일부", loading.md 권장).

| 세그먼트 | 내용 |
|---|---|
| `(site)/notices/loading.tsx` | h1 "공지" + 필터 자리(Skeleton 필 1줄) + `ListRowsSkeleton` |
| `(site)/notices/[id]/loading.tsx` | `DetailSkeleton` |
| `(site)/bulletins/loading.tsx` | h1 "주보" + `ListRowsSkeleton` |
| `(site)/events/loading.tsx` | h1 "일정" + 필터 자리 + 캘린더 블록(Skeleton 대형 1개, 실물 캘린더 높이 근사) |
| `(site)/events/[id]/loading.tsx` | `DetailSkeleton` |
| `(site)/sermons/loading.tsx` | h1 "설교" + 필터 자리 + `CardGridSkeleton` |
| `(site)/sermons/[id]/loading.tsx` | `DetailSkeleton` |

**제외와 이유**: `worship`·`about/*`·`departments`·메인 = 상수 구동 정적(API 0, 지연 없음).
`gallery`·`challenges`·`mypage/*` = CSR(TanStack Query)로 자체 pending 처리(갤러리는
`AlbumCardSkeleton` 기존). 어드민 `new`/`edit` = 클라이언트 폼.

## 5. 에러 처리

`loading.tsx`는 표시 전용(로직 0)이라 새 에러 경로가 없다. 서버 렌더 실패는 기존
`error.tsx`/`notFound` 경로 그대로다(변경 없음).

## 6. 테스트 (검수 기준)

- **단위**: 스켈레톤 3종 — 렌더 스모크 + `aria-hidden` + `rows`/`count` 반복 수
  (프로젝트 테스트 관례: vitest globals 명시 import, `container.querySelector`).
- **수동 검증(구현 후)**:
  1. `pnpm dev`에서 네트워크 스로틀(Slow 3G) 걸고 공지→상세→주보→설교 이동 시
     클릭 즉시 스켈레톤이 뜨는지.
  2. 모바일 폭(375px)에서 스켈레톤 그리드가 1-up으로 접히는지.
  3. 페이지네이션·태그 필터 클릭(같은 목록 내 searchParams 변경)에도 fallback이 뜨는지 —
     안 뜨면 그 케이스는 별도 이슈로 분리(이번 범위는 세그먼트 이동).
  4. 스켈레톤→실제 콘텐츠 교체 시 레이아웃 점프가 없는지.
- `pnpm lint` + `npx tsc --noEmit` + `pnpm build` 통과.

## 7. 비범위 (명시)

- 전역 로딩 모달·상단 프로그레스 바(`useLinkStatus`) — 보류.
- 캐싱 정책 변경(revalidate 조정, `use cache`/Cache Components 도입) — 별개 최적화.
- 이미지 blur placeholder(`blurDataURL`) — 원격 이미지 생성 비용 대비 효과 불충분, 보류.
- 회원·어드민 CSR 구간의 pending 커버리지 확대 — 필요 시 별도 이슈.
