# 연락처·오시는 길 페이지(`/about/location`) UI/UX 재디자인 설계

- 이슈: `.issues/20260625_디자인_연락처_오시는길_페이지_UIUX.md`
- 작성일: 2026-06-26
- 상태: 설계 확정(구현 대기)

## 배경 (Context)

현재 `/about/location`(`src/app/(site)/about/location/page.tsx`)은 `Container` 한 겹에
제목·주소·교통안내(자가용/내비게이션)·지도(빈 `MAP_EMBED_SRC` → 카카오맵 링크 폴백)만
세로로 쌓은 최소 페이지다. 문제:

- **연락처 누락** — `church.ts`에 `CHURCH_PHONE`·`CHURCH_EMAIL`이 있는데 화면에 노출되지 않는다.
- **시각 위계·페이지 리듬 없음** — 흰↔회색 밴드 교차, `Reveal` 등장, 비대칭 그리드 등
  최근 재디자인 페이지(교회사진 #72, 소개·비전 #69, 목회자 #67, 연혁 #64)와 톤이 어긋난다.
- **지도** — 실제 지도가 아니라 **약도(그림 지도)** 로 가기로 결정. 현재는 placeholder 이미지로 채운다.

목표: 주소·전화·이메일 연락 정보와 약도를 **한눈에** 보이는 명확한 위계로 재구성하고,
디자인 시스템 토큰·페이지 리듬으로 기존 재디자인 페이지와 톤을 통일한다.

## 범위 (Scope)

**포함**
- `/about/location` 페이지를 2개 섹션 + 기존 `CtaBand`(레이아웃 자동) 구조로 재구성
- 연락처(주소·전화·이메일) 노출, 약도 이미지(placeholder)·길찾기 링크, 교통 안내 카드
- 콘텐츠 상수(`content.ts` `LOCATION`) 재구성, 약도 에셋 경로 신설

**비포함 (Non-goals)**
- `church.ts`의 주소·전화·이메일·`MAP_EMBED_SRC`·`mapSearchUrl` 변경 없음
- 실제 대중교통(버스 노선) 콘텐츠 작성 — 상수 구조만 마련, 실제 문구는 교회가 채움
- 백엔드/API 연동(이 페이지는 정적 생성 유지)

## 레이아웃 (확정: 정보+약도 2단)

```
흰 ──────────────────────────────────────
  오시는 길 (h1)
  은샘교회를 찾아오시는 길을 안내합니다. (lead)
  ┌─ 좌(5) ────────────┬─ 우(7) ───────────┐
  │ 주소  ____________ │                    │
  │ 전화  ____________ │  [ 약도 이미지 ]    │
  │ 이메일 ___________ │  (placeholder)     │
  │                    │  [카카오맵 길찾기]  │
회색 ─────────────────┴────────────────────
  찾아오는 방법 (titleLg)
  ┌─────────┐ ┌─────────┐
  │ 자가용   │ │ 대중교통 │   아이콘 카드
  └─────────┘ └─────────┘
다크 ──── 기존 CtaBand (레이아웃에서 자동) ────
```

데스크톱 기준. 모바일은 2단 그리드가 세로 1단으로 접히고 섹션 패딩 64px(`py-section` 토큰).

## 컴포넌트 설계

기존 `src/components/about/` 섹션 컴포넌트 관례(PastorIntro/PastorDossier/VisionGoals)를 따른다.
페이지는 얇게 조립만 한다.

### ① `src/components/about/LocationContact.tsx` (신규, 서버 컴포넌트)
흰 캔버스 섹션. `Container as="section"` + `Reveal`.

- 헤더: `h1` `typo.displayMd text-ink` = `LOCATION.title` / lead `p` `typo.bodyMd text-body` = `LOCATION.lead`
- 본문: `grid gap-xl lg:grid-cols-[5fr_7fr]`
  - **좌 — 연락 정보**: 주소·전화·이메일 3행, 각 행 `border-b border-hairline py-base`.
    라벨 `typo.captionStrong text-muted`(주소/전화/이메일) + 값 `typo.bodyMd text-ink`.
    - 주소 = `CHURCH_ADDRESS`
    - 전화 = `CHURCH_PHONE`, `<a href={`tel:${CHURCH_PHONE}`}>` (고령 사용자 탭 발신)
    - 이메일 = `CHURCH_EMAIL`, `<a href={`mailto:${CHURCH_EMAIL}`}>`
  - **우 — 약도**: 기존 폴백 분기 보존(삼항)
    - `MAP_EMBED_SRC` 있음 → `iframe`(title `"교회 위치 지도"`, `aspect-video w-full rounded-xl border border-hairline`, `loading="lazy"`) — 기존과 동일
    - 비면 → 약도 `<img src={LOCATION.map.src} alt={LOCATION.map.alt} loading="lazy"
      className="aspect-[4/3] w-full rounded-xl border border-hairline object-cover">` +
      그 아래 `<a className={buttonVariants("secondary")} href={mapSearchUrl(CHURCH_ADDRESS)} target="_blank" rel="noopener noreferrer">카카오맵 길찾기</a>`
    - `<img>` 채택 이유: 교회사진(#72) 프레젠테이션 셸 관례와 동일, swappable placeholder라 next/image 설정·테스트 모킹 불필요(YAGNI)

### ② `src/components/about/LocationDirections.tsx` (신규, 서버 컴포넌트)
회색 밴드 섹션. `bg-surface-soft` + `Container as="section"` + `Reveal`.

- 헤더: `h2` `typo.titleLg text-ink` = `LOCATION.directionsHeading`
- 카드 그리드: `grid gap-base sm:grid-cols-2` (VisionGoals/PastorDossier 패턴)
  - 카드: `bg-canvas rounded-xl border border-hairline p-xl`
  - 아이콘: lucide `currentColor`+`size={32}`, `text-primary`. 매핑 record(상수 key→아이콘):
    `const DIRECTION_ICONS = { car: Car, transit: Bus }`(컴포넌트 내부, key는 상수 직렬화값)
  - 제목 `typo.titleMd text-ink` = item.title / 본문 lines `typo.bodyMd text-body`
  - `LOCATION.directions` 배열을 `map`, 스태거 `Reveal delay={i * 120}`

### ③ `src/app/(site)/about/location/page.tsx` (수정)
`<LocationContact /> <LocationDirections />` 조립만. 정적 생성 유지(설정 변경 없음).

## 상수 변경 (`src/constants/content.ts` `LOCATION`)

`transit: string[]` → 구조화. 기존 두 문장은 자가용 카드 2 lines로 이관.

```ts
export const LOCATION = {
  title: "오시는 길",
  lead: "은샘교회를 찾아오시는 길을 안내합니다.",
  map: { src: "/location/map-placeholder.png", alt: "은샘교회 약도" },
  directionsHeading: "찾아오는 방법",
  directions: [
    {
      key: "car",
      title: "자가용",
      lines: [
        "교회 주차 공간이 마련되어 있습니다.",
        "내비게이션: '은샘교회' 또는 '수암산로 260' 검색",
      ],
    },
    { key: "transit", title: "대중교통", lines: ["버스 노선 정보 준비 중입니다."] }, // 교회가 실제 문구로 교체
  ],
};
```

약도 에셋: `public/location/map-placeholder.png`. 교회가 약도 이미지를 넣는다.
에셋이 아직 없으면 구현 시 간단한 SVG/플레이스홀더를 임시로 둔다(빌드·테스트 깨짐 방지).

`src/constants/church.ts`는 **변경 없음**.

## 폴백 동작 (이슈 요구 보존)

`MAP_EMBED_SRC` 있음 → iframe / 없음 → 약도 이미지 + 카카오맵 길찾기 링크.
"임베드 비면 외부 지도 링크로 폴백" 동작과 그 테스트 분기를 둘 다 보존하면서,
빈 링크만 있던 자리를 약도 이미지가 채운다.

## 디자인 시스템 준수

- 토큰·`typo.*`만 사용, hex·px 인라인 0 (arbitrary value 금지)
- 색: `bg-canvas`/`bg-surface-soft`/`text-ink`/`text-body`/`text-muted`/`text-primary`/`border-hairline`
- 라운드: 카드·약도 `rounded-xl`(24px), 버튼 `buttonVariants`(16px) — 중첩 라디우스 관례
- lucide-react만(`Car`·`Bus`), `currentColor`+`size` prop
- JSX 조건부는 삼항(`{cond ? <X/> : null}`), `cn()` 내부 `&&`만 허용
- 콘텐츠 상수 주입(주소·전화·이메일·약도·교통 lines). 구조적 UI 라벨(주소/전화/이메일/카카오맵 길찾기)은 인라인(기존 "지도에서 보기" 관례)

## 검증 (TDD)

기존 테스트가 변경에 직접 영향받으므로 **먼저 갱신**(RED→GREEN).

- `page.test.tsx`(폴백 분기): 현재 `LOCATION.transit[0]`·링크명 `"지도에서 보기"`를 단언 → 변경 필요.
  갱신 후 단언: 제목, `CHURCH_ADDRESS`, `CHURCH_PHONE`(tel 링크), `CHURCH_EMAIL`(mailto 링크),
  약도 이미지(`getByAltText(LOCATION.map.alt)`), 길찾기 링크(`name: "카카오맵 길찾기"`),
  교통 카드(`LOCATION.directions[0].title` 등)
- `page.embed.test.tsx`(iframe 분기): church 모킹에 `CHURCH_PHONE`·`CHURCH_EMAIL` 추가 필요
  (새 컴포넌트가 import). iframe(title `"교회 위치 지도"`) 유지, 길찾기 링크 부재 단언은 새 라벨로 갱신
- 관례 준수(메모리 `frontend-test-conventions`): vitest `globals:false` 명시 import, jest-dom 미사용
  (`getAttribute`/`toBeDefined`), 장식 이미지가 아닌 약도는 의미 있는 alt
- `Reveal`의 IntersectionObserver는 `vitest.setup.ts`에서 전역 스텁됨 → 렌더 OK

게이트:
```bash
pnpm lint
npx tsc --noEmit
pnpm test
pnpm build        # 정적 생성 확인
pnpm dev          # 데스크톱/태블릿/모바일 반응형·고령 가독성·터치 타깃 육안 확인
```
