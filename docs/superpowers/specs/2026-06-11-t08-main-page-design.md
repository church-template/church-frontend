# T08 메인 페이지 설계 스펙 — 13장 + 14A CrossHero

> 2026-06-11 브레인스토밍 확정본.
> 근거 문서: `.issues/T08-main-page.md`, 가이드 13장·14A, DESIGN.md, `docs/api-docs.json`.
> 선행: T7(앱 셸)·T6(공통 유틸)·T2(토큰) — 모두 완료 상태에서 출발한다.

## 1. 목적

공개 메인 화면. `GET /api/main` 한 번으로 받은 카드 메타(최신 설교 3·공지 3·다가오는 일정 5)를
**서버 컴포넌트 + ISR(60s)** 로 렌더하고, 최상단에 십자가 열쇠구멍 히어로(14A CrossHero)를 얹는다.

## 2. 확정 결정

| # | 결정 | 내용 · 근거 |
|---|---|---|
| D1 | 설교 카드 = **텍스트형** | `SermonCardResponse`에 썸네일·videoUrl 필드가 없다(api-docs 확인). 가이드 13.2 매핑(title·preacher·preachedAt·series/scripture·tags)에도 썸네일이 없음 → 가짜 이미지 대신 본문 정보만으로 구성. `SermonCard`의 `thumbnailUrl`을 optional로 확장 |
| D2 | 일정 카드 클릭 = **`/events/{id}`** | 설교·공지 카드와 동일 패턴(카드=개별 콘텐츠 링크). 라우트는 T12 구현, 경로만 선맞춤 |
| D3 | 히어로 에셋 = **플레이스홀더 생성** | `public/hero-poster.jpg`(다크 네이비 그라데이션 1920×1080) 생성. `hero.mp4`는 ffmpeg 가용 시에만 생성 — 없으면 `onError→poster` 폴백이 기본 경로로 동작해 검수 항목이 자연 검증됨. 실제 에셋은 추후 파일 교체만 |
| D4 | fetch 실패 = **throw → `error.tsx`** | `!res.ok`·파싱 실패 시 throw. ISR 특성상 성공 캐시가 있으면 재검증 실패 시 stale 서빙되므로, 실제 노출은 "캐시 없는 최초 요청 + API 장애"뿐 |
| D5 | 구조 = **섹션 컴포넌트 분리(A안)** | `page.tsx`는 fetch+합성만. 섹션마다 실제 로직(빈 배열·일정 엣지·고정 배지)이 있어 빈 추상화가 아님. 카드 확장은 T10~T12 목록 페이지가 재사용 |
| D6 | 투명 헤더 = **스크롤 전환(IO)** | 히어로 위 = transparent, 히어로 이탈 = fixed 유지 + 라이트 스킨. T07이 남긴 `TODO(T8/T9)` 해소. mix-blend는 영상 위 색 반전 불안정으로 기각 |
| D7 | 히어로 콘텐츠 = **상수 주입 유지** | 이슈의 env 방식 대신 T07 스펙 D2에서 확정된 `constants/church.ts`(`HERO`·`HERO_CAPTION`) 사용 — 기존 결정 승계, env 추가 없음 |

## 3. 파일 구조

```
신규
├─ src/lib/api/types.ts               # TagResponse·SermonCardResponse·NoticeCardResponse·
│                                     #   EventCardResponse·MainResponse — api-docs.json 그대로 선언
├─ src/lib/api/main.ts                # getMain(): fetch(apiUrl("/api/main"), { next: { revalidate: 60 } })
├─ src/hero/CrossHero.tsx             # 14A.4 참조 구현 그대로 (client). import는 "./types"
├─ src/hero/CrossHero.module.css      # 14A.4 참조 CSS 그대로
├─ src/components/main/HeroHeaderSync.tsx  # (client) SiteHeader×CrossHero 합성 + IO 전환
├─ src/components/main/WorshipSection.tsx  # WORSHIP_SERVICES → ScheduleCard 그리드
├─ src/components/main/SermonSection.tsx   # sermons[] → SermonCard(텍스트형) 3-up
├─ src/components/main/NoticeSection.tsx   # notices[] → NoticeRow 목록
├─ src/components/main/EventSection.tsx    # upcomingEvents[] → EventCard 그리드
└─ public/hero-poster.jpg             # 개발용 플레이스홀더 (hero.mp4는 ffmpeg 가용 시)

변경
├─ src/app/page.tsx                   # async 서버 컴포넌트 재작성 — getMain + 섹션 합성
├─ src/components/cards/SermonCard.tsx    # thumbnailUrl?: string + series?·scripture?·tags? 추가
├─ src/components/cards/EventCard.tsx     # summary?: string + time?·location? 추가
├─ src/components/cards/NoticeRow.tsx     # isPinned?: boolean → "고정" 배지(primary)
├─ src/components/shell/SiteHeader.tsx    # solid?: boolean — transparent의 라이트 스킨 상태
├─ src/components/common/TagFilter.tsx    # Tag 타입을 lib/api/types.ts로 이동, 재export로 호환 유지
└─ src/lib/date.ts                    # formatDate·formatEventTime 포맷터 추가 (Intl, 의존성 없음)
```

## 4. 데이터 연동

- `getMain(): Promise<MainResponse>` — 서버 전용. `!res.ok`면 throw(D4). 배열 필드는 `?? []` 방어만
  (자체 백엔드 + OpenAPI 단일 진실 → zod 런타임 검증은 과함).
- TanStack Query 금지(공개 영역, 15.1 경계). **프론트 재정렬 금지**(서버 보장: 설교 `preachedAt desc`,
  공지 고정글 우선, 일정 `startAt asc`).
- 날짜는 `parseServerDate`(+09:00) → `lib/date.ts` 포맷터가 **문자열로 변환 후** 카드에 전달.
  카드는 끝까지 순수 표시 컴포넌트.

### 날짜 포맷터 명세 (`lib/date.ts`)

구현은 **`Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", ... })`** — 의존성 없음.
date-fns를 쓰지 않는 이유: ① T08은 포맷터 2개뿐이라 Intl로 충분 ② date-fns `format()`은
런타임 로컬 TZ 기준이라 비KST 서버(ISR)에서 시각이 어긋남(date-fns-tz까지 필요해짐) — Intl의
`timeZone` 고정이 `parseServerDate`(+09:00)와 정확히 왕복. date-fns 도입은 캘린더가 실제로
필요로 하는 T12에서 한다(가이드 15.1의 용도도 "캘린더 셀 계산").

| 함수 | 입력 | 출력 규칙 |
|---|---|---|
| `formatDate(iso)` | `preachedAt`(date)·`createdAt`(datetime) | `2026. 6. 1.` — datetime 토큰(tnum)과 함께 사용 |
| `formatEventTime(startAt, endAt, allDay)` | EventCard 시간줄 전용. **날짜는 배지가 담당**하므로 중복 표기하지 않는다 | `allDay=true` → `null`(시간 생략, 13.2) — 단 여러 날이면 `~ 6. 15.` 종료일만 / `endAt=null` → `10:00` 시작 시각만 / 같은 날 범위 → `10:00 ~ 12:00` / 다른 날 범위 → `10:00 ~ 6. 15. 12:00`(종료일 한정) |

## 5. 페이지 구성·밴드 리듬 (13.4 + DESIGN 교차 리듬)

| # | 섹션 | 배경 | 내용 |
|---|---|---|---|
| 1 | CrossHero | 다크/미디어 | 14A. `HeroHeaderSync`가 헤더와 함께 합성 |
| 2 | 예배 시간 안내 | 흰 캔버스 | `WORSHIP_SERVICES` → soft `ScheduleCard` 그리드(기존 재사용) |
| 3 | 최신 설교 3 | **surface-soft 밴드** | 텍스트형 `SermonCard` 3-up → `/sermons/{id}` |
| 4 | 공지 3 | 흰 캔버스 | `NoticeRow` + `isPinned` 고정 배지 → `/notices/{id}` |
| 5 | 다가오는 일정 5 | **surface-soft 밴드** | `EventCard` 그리드 → `/events/{id}` |
| 6 | CTA 밴드 | 다크 | 기존 `CtaBand` 재사용 |
| 7 | 푸터 | — | 기존 `SiteFooter` |

- 모든 섹션 `Container`(1200/24) + `py-section`(96px, 모바일 64px) 공유. 별도 폭 금지(14.3).
- 섹션 헤딩 = `typo.displayLg`(DESIGN.md "섹션 헤드" 용도).
- 카드 그리드: 데스크톱 3-up · 태블릿 2-up · 모바일 1-up(DESIGN 반응형).
- **빈 배열**: 섹션 유지 + `EmptyState("등록된 ○○가 없습니다")` — 레이아웃 점프 방지.
- `viewCount`·`author`는 메인 카드에서 생략(13.2 권장).
- 메인은 `SiteShell`을 쓰지 않는다 — `HeroHeaderSync`(헤더) + 섹션 + `CtaBand` + `SiteFooter` 직접 합성.

## 6. 카드 확장 (모두 하위 호환 — optional props만 추가)

| 카드 | 추가 props | 메인에서의 모습 |
|---|---|---|
| `SermonCard` | `thumbnailUrl?`·`series?`·`scripture?`·`tags?: string[]` | 썸네일 없음. 보조줄(series · scripture, muted) → 제목(title-md) → 설교자·날짜(datetime) → 태그 배지 |
| `EventCard` | `summary?`·`time?`·`location?` | 날짜 배지(시작일, `formatDate`) + 제목 + 시간줄(`formatEventTime`, datetime 토큰, null이면 생략) + 장소(body-sm muted). summary 없으면 생략 |
| `NoticeRow` | `isPinned?: boolean` | 제목 앞 "고정" 배지(primary). 기존 `isNew`는 쇼케이스 호환용 유지 |

기존 호출부(쇼케이스 `_before`)는 그대로 동작해야 한다 — 기존 테스트 회귀 0.

## 7. CrossHero (14A 준수)

- **참조 구현(14A.4) 로직 변경 금지** — scroll·rAF 스로틀·SVG mask·`transform: scale`·`easeIn(t³)`·
  구간 분할(0~0.72 구멍, 0.78~0.95 카피) 그대로. 확정 비율(14A.3: 16/64/16/32%/38%/0.85) 그대로.
- 변경점 2개뿐: ① import `from "./types"` (기존 `src/hero/types.ts` 공유 모듈) ② 배치 위치 `src/hero/`.
- **토큰 예외(이슈 3.4)**: 검증 로직 내부 `rgba(10,15,31,0.85)`·SVG 좌표·CSS Module `#fff`는 인라인 유지.
  `cover-dark`(#0a0f1f) 토큰은 globals.css에 이미 존재(값 일치 확인).
- 카피: `HERO_CAPTION` 배열을 page에서 `<span>`+`<br/>`로 합성해 `caption: ReactNode` 전달.
- 접근성(14A.5): reduced-motion 시 덮개 제거·카피 정적·JS 미등록 / `muted`+`playsInline` /
  `100vh`+`100dvh` 중복 선언 / 카피 opacity 0이어도 DOM 존재(SEO) / 십자가 SVG `aria-hidden`.
- 금지(14A.6): width/height 확대 금지, 배율 px 하드코딩 금지, rAF 없는 스크롤 DOM 갱신 금지,
  중앙 헤드라인·스크롤 힌트 추가 금지, 14A.3 비율 변경 금지.

## 8. 투명 헤더 스크롤 전환 (`HeroHeaderSync`)

- (client) 컴포넌트. 자신이 렌더한 히어로 래퍼를 ref로 잡고 IntersectionObserver로 관찰:
  - 히어로가 뷰포트와 교차 중 → `<SiteHeader variant="transparent" />`(현행 on-dark)
  - 히어로 이탈(320vh 통과) → `fixed` 유지 + **라이트 스킨**(bg-canvas·text-ink·border-hairline), 0.2s transition
- `SiteHeader`에 `solid?: boolean` prop 추가 — transparent variant의 스킨 상태만 제어. light variant 무영향.
- 구성: `<HeroHeaderSync media={HERO} caption={...} />` 가 헤더+CrossHero를 함께 렌더 →
  전역 셀렉터·body 변이 없이 ref 기반으로 동기화.

## 9. 에러 처리

- `getMain` throw → 루트 `error.tsx`(T07)가 표시. 메인 전용 에러 UI 없음(단순·정직).
- 영상 로드 실패 → `videoFailed` state → poster `<img>` 폴백(참조 구현 내장).
- 빈 배열 → §5 EmptyState. 세 배열 동시 빈 경우도 동일 규칙(초기 구축 상태).

## 10. 테스트 전략 (TDD, RED→GREEN→REFACTOR)

| 대상 | 검증 |
|---|---|
| `formatDate`·`formatEventTime` | allDay 단일/여러 날, `endAt=null`, 같은 날 범위, 다른 날 범위 |
| `getMain` | fetch mock — URL·`revalidate: 60` 전달, `!ok` throw, 배열 `?? []` 방어 |
| 카드 3종 확장 | 텍스트형 렌더·tags·고정 배지·time/location + **기존 테스트 회귀 0** |
| 섹션 4종 | 매핑·href(`/sermons/{id}`·`/notices/{id}`·`/events/{id}`)·빈 배열 EmptyState |
| `SiteHeader solid`·`HeroHeaderSync` | IO mock으로 transparent↔solid 전환 |
| `CrossHero` | caption DOM 존재(opacity 0)·`aria-hidden`·video onError→img 폴백·reduced-motion 시 리스너 미등록 |
| `page.tsx` | getMain mock으로 async RSC 렌더 — 7개 구성요소 존재 |

- 스크롤 연출(14A.7 검수 9항목)은 jsdom 불가 → **dev 서버 수동/Playwright 검수 체크리스트**로 분리.
- 커버리지 80%+ 유지.

## 11. 범위 밖 (이번 이슈에서 하지 않음)

- 섹션 "더보기" 링크(이슈 미요구, YAGNI) / 설교·공지·일정 목록·상세 페이지(T10~T12) /
  실제 히어로 에셋 제작(교회 제공) / 부서 히어로 DeptHero(T9).
