# 예배 시간 안내 페이지(`/worship`) UI/UX 재디자인 설계

- 이슈: `.issues/20260627_디자인_예배시간_안내_페이지_UIUX.md` (#76)
- 작성일: 2026-07-01
- 상태: 설계 확정(구현 대기)

## 배경 (Context)

현재 `/worship`(`src/app/(site)/worship/page.tsx`)은 `Container` 한 겹에 제목 +
`WORSHIP_SERVICES` 4개를 3-up 카드 그리드로 쌓은 최소 페이지다. 문제:

- **콘텐츠 빈약** — 정기 예배만 이름·시간·장소로 노출. 이슈가 요구하는 찬양 시간·예배별 설명,
  특별 예배(6종), 장소·참석 안내가 없다.
- **시각 위계·페이지 리듬 없음** — 흰↔회색↔다크 밴드 교차, `Reveal` 등장 등 최근 재디자인
  페이지(오시는 길 #74, 교회사진 #72, 소개·비전 #69)와 톤이 어긋난다.

목표: 정기·특별 예배와 장소·참석 안내를 명확한 위계로 재구성하고, 디자인 시스템 토큰·페이지
리듬으로 기존 재디자인 페이지와 톤을 통일한다. 지도는 중복하지 않고 `/about/location`(#74)에 위임한다.

## 범위 (Scope)

**포함**
- `/worship` 페이지를 3개 섹션(흰·회색·다크) 구조로 재구성
- 정기 예배(찬양 시간·설명 3줄 포함), 특별 예배(6종), 장소·참석 안내
- 콘텐츠 상수(`content.ts`) 확장 — 기존 필드 유지(비파괴), 신규 필드·상수 추가

**비포함 (Non-goals)**
- `church.ts` 변경 없음(주소·전화 재사용)
- 메인 페이지 `WorshipSection.tsx`·`ScheduleCard.tsx` 변경 없음
- 지도 임베드/약도(오시는 길 #74에 위임) — `/worship`엔 링크만
- 백엔드/API 연동(정적 생성 유지)

## 레이아웃 (확정)

```
흰 ──────────────────────────────────────
  예배 시간 안내 (h1, displayMd)
  매주 드리는 정기 예배에 참여하여… (lead)
  ┌─────────┐ ┌─────────┐   2×2 (모바일 1-up)
  │ 새벽예배  │ │ 주일예배  │   이름·대표시간·찬양시간·설명 3줄
  └─────────┘ └─────────┘
  ┌─────────┐ ┌─────────┐
  │ 수요예배  │ │ 학생·청년 │
  └─────────┘ └─────────┘
회색 ─────────────────────────────────────
  특별 예배 (h2, titleLg)
  연중 진행되는 의미 있는… (lead)
  ┌────────┐ ┌────────┐ ┌────────┐  EventCard 3-up (6종 → 3×2)
  │(1월1일) │ │(부활절) │ │(창립)  │  날짜 배지·제목·시간·설명
  └────────┘ └────────┘ └────────┘
다크 ─────────────────────────────────────
  ┌─ 좌 ───────────────┬─ 우 ──────────────┐
  │ 예배 장소 안내 (h2) │ 예배 참석 안내 (h3)│
  │ 주소·유리건물       │ 처음 오시는 분들도…│
  │ 문의 041-…(tel)     │ · 10:40 찬양       │
  │ [오시는 길 자세히 →]│ · 교제 시간        │
  │                     │ · 주차             │
  └─────────────────────┴────────────────────┘
```

데스크톱 기준. 모바일은 각 그리드가 세로 1단으로 접히고 섹션 패딩 64px(`py-section` 토큰).

## 컴포넌트 설계

기존 `src/components/about/` 섹션 컴포넌트 관례(LocationContact/LocationDirections)를 따른다.
페이지는 얇게 조립만 한다. 신규 디렉터리 `src/components/worship/`.

### ① `WorshipRegular.tsx` (신규, 서버 컴포넌트) — 흰 캔버스
`Container as="section" className="break-keep py-section"` + `Reveal`.

- 헤더: `h1` `typo.displayMd text-ink` = `WORSHIP.title` / lead `p` `typo.bodyMd text-body` = `WORSHIP.regularLead`
- 카드 그리드: `mt-xxl grid gap-base sm:grid-cols-2`
  - 카드: `Card surface="soft"` `p-xl`(예배시간 카드 배경=surface-soft, DESIGN)
  - 이름 `h3` `typo.titleMd text-ink` = `s.name`
  - 대표시간 `typo.datetime text-body` = `s.time`
  - 찬양시간(있을 때만, 삼항) `typo.datetime text-muted` = `s.praise`
  - 설명 3줄 `typo.bodySm text-body`, `s.notes.map` (첫 줄 `mt-base`, 이후 `mt-xs`)
  - `WORSHIP_SERVICES.map`, 스태거 `Reveal delay={i * 120}`, 카드 `h-full`로 행 높이 통일

### ② `WorshipSpecial.tsx` (신규, 서버 컴포넌트) — 회색 밴드
`bg-surface-soft` `section` + `Container` + `Reveal`.

- 헤더: `h2` `typo.titleLg text-ink` = `WORSHIP.specialHeading` / lead = `WORSHIP.specialLead`
- 카드 그리드: `mt-xxl grid gap-base sm:grid-cols-2 lg:grid-cols-3`
  - **기존 `EventCard` 재사용**(신규 카드 만들지 않음): `date={s.date}` `title={s.name}`
    `time={s.time}` `summary={s.desc}`, `href` 없음(비인터랙티브)
  - `SPECIAL_SERVICES.map`, 스태거 `Reveal delay={i * 120}`
  - 주의: EventCard 비-href는 `Card bordered`(기본 `bg-surface-card`=흰) → surface-soft 밴드 위에서 카드가 뜬다

### ③ `WorshipPlace.tsx` (신규, 서버 컴포넌트) — 다크 밴드
`bg-surface-dark` `section py-section` + `Container` + `Reveal`. `CtaBand` 토큰 차용
(on-dark / on-dark-soft / outlineOnDark). 2-up: `grid gap-xl lg:grid-cols-2 lg:items-start`.

- **좌 — 장소 안내**
  - `h2` `typo.titleLg text-on-dark` = `WORSHIP.placeHeading`
  - lead `typo.bodyMd text-on-dark-soft` = `WORSHIP.placeLead`
  - 주소 `typo.bodyMd text-on-dark` = `CHURCH_ADDRESS`, 부가 `typo.bodySm text-on-dark-soft` = `WORSHIP.placeLandmark`("유리 건물"). lucide `MapPin`(currentColor·size 20) 선택
  - 문의 `<a href={`tel:${CHURCH_PHONE}`}>` `typo.bodyMd text-on-dark`. lucide `Phone` 선택
  - `<Link href="/about/location" className={cn(buttonVariants("outlineOnDark"), "h-14 px-8")}>오시는 길 자세히</Link>`(CtaBand 보조 CTA와 동일 크기)
- **우 — 참석 안내**
  - `h3` `typo.titleMd text-on-dark` = `WORSHIP.attendHeading`
  - lead `typo.bodySm text-on-dark-soft` = `WORSHIP.attendLead`
  - 안내 3줄 `WORSHIP.attendNotes.map` `typo.bodyMd text-on-dark`(lucide `Check` size 20 선택, currentColor)

### ④ `src/app/(site)/worship/page.tsx` (수정)
`<WorshipRegular /> <WorshipSpecial /> <WorshipPlace />` 조립만. 정적 생성 유지.

## 상수 변경 (`src/constants/content.ts`) — 비파괴

메인 페이지가 `WORSHIP.title`·`WORSHIP_SERVICES[].place`를 소비하므로 **기존 필드 유지**, 추가만.

```ts
export const WORSHIP = {
  title: "예배 시간 안내",
  regularLead: "매주 드리는 정기 예배에 참여하여 하나님과 더 가까이 만나세요.",
  specialHeading: "특별 예배",
  specialLead: "연중 진행되는 의미 있는 특별 예배들입니다.",
  placeHeading: "예배 장소 안내",
  placeLead: "모든 예배는 교회에서 진행됩니다.",
  placeLandmark: "유리 건물",
  attendHeading: "예배 참석 안내",
  attendLead: "처음 오시는 분들도 편안하게 참석하실 수 있습니다.",
  attendNotes: [
    "오전 10시 40분부터 찬양으로 예배합니다.",
    "예배 후 간단한 교제 시간이 있습니다.",
    "주차 공간이 준비되어 있습니다.",
  ],
};

export interface WorshipService {
  name: string;
  time: string;
  place: string;        // 기존 유지 — 메인 ScheduleCard 소비
  praise?: string;      // 신규 — 찬양 시간 서브라인(없으면 생략)
  notes: string[];      // 신규 — 예배별 설명 3줄
}
export const WORSHIP_SERVICES: WorshipService[] = [
  { name: "새벽예배", time: "월~토 오전 5:30", place: "본당",
    notes: ["새벽 기도와 말씀 묵상", "하루를 시작하는 은혜로운 시간", "조용하고 경건한 분위기"] },
  { name: "주일예배", time: "주일 오전 11:00", place: "본당", praise: "오전 10시 40분 찬양",
    notes: ["주일 대예배 시간", "전 성도가 함께 드리는 예배", "설교·찬양·성찬식 진행"] },
  { name: "수요예배", time: "수요일 오후 7:20", place: "본당", praise: "오후 7시 찬양",
    notes: ["주중 말씀 은혜를 받는 시간", "성경 공부와 기도", "친밀한 교제와 나눔"] },
  { name: "학생·청년예배", time: "토요일 오전 11:00", place: "본당",
    notes: ["주말 예배 시간", "자유롭고 은혜로운 분위기", "학생·청년들을 위한 예배"] },
];

export interface SpecialService {
  name: string;
  date: string;   // 배지 — "1월 1일", "부활절 주일" 등 서술형 혼용
  time: string;
  desc: string;
}
export const SPECIAL_SERVICES: SpecialService[] = [
  { name: "송구영신 예배", date: "1월 1일", time: "오전 0시", desc: "새해를 맞아 하나님께 감사드리는 특별예배" },
  { name: "부활절 예배", date: "부활절 주일", time: "오전 11시", desc: "예수님의 부활을 기념하는 특별예배" },
  { name: "창립기념감사 예배", date: "5월 셋째 주일", time: "오전 11시", desc: "교회 창립을 기념하며 하나님께 감사드리는 예배" },
  { name: "맥추 감사절 예배", date: "6월 마지막 주일", time: "오전 11시", desc: "맥추 감사절을 맞아 첫 열매를 드리며 감사드리는 예배" },
  { name: "추수 감사절 예배", date: "11월 셋째 주일", time: "오전 11시", desc: "한 해의 은혜를 되돌아보며 감사드리는 예배" },
  { name: "성탄절 예배", date: "12월 25일", time: "오전 11시", desc: "예수님의 탄생을 기념하는 성탄절 특별예배" },
];
```

`src/constants/church.ts`는 **변경 없음**(`CHURCH_ADDRESS`·`CHURCH_PHONE` 재사용).

## 디자인 시스템 준수

- 토큰·`typo.*`만, hex·px 인라인 0(arbitrary value 금지). `h-14 px-8`은 CtaBand 선례(간격 토큰)
- 색: `bg-canvas`(기본)/`bg-surface-soft`/`bg-surface-dark`/`text-ink`/`text-body`/`text-muted`/`text-on-dark`/`text-on-dark-soft`/`text-primary`
- 라운드: 카드 `rounded-xl`(Card 고정), 버튼 `buttonVariants`(16px)
- lucide-react만(`MapPin`·`Phone`·`Check`), `currentColor`+`size` prop. 아이콘은 선택(가독성 보조)
- JSX 조건부는 삼항(`{cond ? <X/> : null}`), `cn()` 내부 `&&`만 허용
- 콘텐츠 상수 주입. 구조적 UI 라벨("오시는 길 자세히")은 인라인 허용(오시는 길 관례)

## 검증 (TDD)

기존 테스트가 변경에 직접 영향받으므로 **먼저 갱신**(RED→GREEN).

- `worship/page.test.tsx`(기존): 현재 `getAllByRole("heading", {level:2})` 길이를 `WORSHIP_SERVICES.length`(4)로 단언 → **깨짐**(새 구조에서 예배명은 h3, h2는 섹션 헤딩). 갱신 필요.
- 신규 컴포넌트별 단위 테스트(`WorshipRegular.test.tsx`·`WorshipSpecial.test.tsx`·`WorshipPlace.test.tsx`):
  - Regular: `WORSHIP.title`·예배명·`time`·`praise`(주일)·`notes[0]` 렌더
  - Special: `SPECIAL_SERVICES[0].name`·`date`·`time`·`desc` 렌더, 카드 6개
  - Place: `CHURCH_ADDRESS`·`CHURCH_PHONE`(tel 링크)·`attendNotes[0]` 렌더, `오시는 길 자세히` 링크 `href="/about/location"`
- 관례(메모리 `frontend-test-conventions`): vitest `globals:false` 명시 import, jest-dom 미사용
  (`getAttribute`/`toBeDefined`). `Reveal`의 IntersectionObserver는 `vitest.setup.ts` 전역 스텁
- `church.ts` 모킹이 필요한 테스트는 `CHURCH_ADDRESS`·`CHURCH_PHONE` 포함

게이트:
```bash
pnpm lint
npx tsc --noEmit
pnpm test
pnpm build        # 정적 생성 확인
pnpm dev          # 데스크톱/태블릿/모바일 반응형·고령 가독성·터치 타깃 육안 확인
```
