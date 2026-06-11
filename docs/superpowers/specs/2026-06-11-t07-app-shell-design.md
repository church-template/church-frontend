# T07 — 앱 셸 (레이아웃 · 네비 · 푸터 · 정적 페이지 · 404/error) 설계 스펙

**작성일:** 2026-06-11
**이슈:** `.issues/T07-app-shell.md`
**선행:** T3(시각 컴포넌트), T4(동작 컴포넌트 — Sheet·DropdownMenu), **T6(완료)** — `EmptyState`·토큰·`buttonVariants` 위에 쌓는다.
**참조:** 가이드 0.3·12·13.4·14.3, DESIGN.md(네비·밴드·푸터·레이아웃·z-index) / `node_modules/next/dist/docs/01-app/`(not-found·error 규약)

---

## 1. 목적

모든 페이지가 얹히는 **전역 셸**을 만든다 — 공유 컨테이너(1200/24), 네비게이션 2모드(라이트/투명 + 모바일 Sheet), 프리푸터 CTA 밴드 + 푸터, API에 없는 정적 콘텐츠 페이지(소개·연혁·비전·오시는 길·예배 시간), 라우트 레벨 에러 페이지(404·런타임 바운더리). 도메인 페이지(T8~T16)가 이 셸을 소비한다.

T07은 **셸/프레젠테이션 레이어**다 — 도메인 데이터 패칭이나 히어로(14A/14B) 실제 구현은 포함하지 않는다(투명 네비 variant 자리만 제공).

---

## 2. 확정 결정 (브레인스토밍 결과)

| # | 결정 | 근거 |
|---|---|---|
| D1 | 셸 = **route group `(site)/layout.tsx` + 재사용 `<SiteShell>` 컴포넌트** | 메인(T8)·부서(T9)의 **투명 네비**가 서브페이지 라이트 네비와 충돌 → 루트 레이아웃에 nav를 박으면 라우트별 분기 불가. 그룹 레이아웃이 표준 페이지에 라이트 셸을 주입하고, 메인·부서는 그룹 밖에서 투명 셸을 직접 합성한다. **404/error는 루트 파일이라 그룹 레이아웃을 상속 못 하므로 `<SiteShell>`을 직접 합성**(레이아웃 상속 대신 컴포넌트 합성). |
| D2 | 교회 고유값 = **`church.ts` 상수 유지(env 추가 안 함)** | 사용자 결정. 매직스트링 0(단일 import 지점). `church.ts` 주석 철학 — "교회마다 다른 값"은 상수, "환경마다 다른 값"(API base 등)은 env — 과 일관. 이슈 §6의 "env 주입" 문구는 "상수 파일 주입"으로 완화. |
| D3 | `error.tsx` = **`unstable_retry` 사용**(이슈의 `reset` 대체) | `node_modules/.../03-file-conventions/error.md:157`: *"In most cases, you should use `unstable_retry()` instead"* (Version History: `v16.2.0`에 `unstable_retry` prop 추가). `reset`도 존재하나 문서 권장 API는 `unstable_retry`. AGENTS.md(이 Next는 다르다) 준수. |
| D4 | 정적 페이지 = **간단 디자인**(라우트 + DESIGN 토큰 단순 섹션, 콘텐츠는 constants) | T07은 "셸"이 주제, 정적 페이지는 조연. 과설계 금지(YAGNI). 배포 시 상수 교체로 실제 문구 주입. |
| D5 | 네비 = **전체 IA 링크**(T8~T16 미구현 라우트 포함) | 경로 구조를 지금 확정. 미구현 라우트는 생성 시 자연 연결되고, 그전엔 커스텀 404가 안내. |
| D6 | global 파일 = **`global-error.tsx`만 추가** (`global-not-found` 제외) | `global-not-found`는 experimental + `next.config` flag + 셸 중복 필요. 루트 `not-found.tsx`가 이미 셸 위 404를 제공(미매칭 URL도 커버) → UX 우위. |
| D7 | `app/page.tsx` = **임시 홈으로 교체** | create-next-app 보일러플레이트 제거(리포 정합성). 라이트 셸 + "T8 예정" 플레이스홀더. T08 CrossHero가 덮어쓴다. |
| D8 | `<Container>` 컴포넌트로 **1200/24 단일화** | 검수 §8.1("모든 섹션·히어로가 컨테이너 하나 공유")를 구조로 보증. `mx-auto max-w-[var(--container-max)] px-[var(--container-padding)]`. (메모리: `max-w-md` 류 t-shirt 토큰 충돌 회피) |
| D9 | `CtaBand` = **전역 프리푸터** | 표준 페이지·메인 공통(DESIGN "프리푸터"). 404/error는 `showCtaBand={false}`(에러 화면의 "새가족 안내"는 부적절). |
| D10 | 오시는 길 지도 = **라이브러리 금지 → 선택적 iframe 임베드 / 외부 링크 폴백** | 허용 스택(15.1) 밖 지도 SDK 도입 금지. 상수 `MAP_EMBED_SRC`가 있으면 `<iframe>`, 없으면 주소 + "지도에서 보기" 외부 링크. |

---

## 3. 셸 아키텍처

```
요청
 ├─ 표준 서브페이지   → app/(site)/layout.tsx → <SiteShell>  (라이트 네비 + CtaBand + Footer; light는 SiteShell 내부 고정)
 ├─ 메인(T8)/부서(T9) → 그룹 밖. <SiteHeader variant="transparent"> 직접 합성 (히어로 위 투명)
 ├─ 미매칭 URL·notFound() → app/not-found.tsx → <SiteShell showCtaBand={false}> + 404 UI
 ├─ 런타임 예외        → app/error.tsx ('use client') → <SiteShell showCtaBand={false}> + 재시도 UI
 └─ 루트 레이아웃 붕괴 → app/global-error.tsx ('use client', 자체 html/body)
```

- 루트 `app/layout.tsx`는 **변경 없음**(html/body/폰트/Providers/Toaster 최소 유지). 네비/푸터를 넣지 않는다(D1).
- `<SiteShell>`은 순수 합성 컴포넌트라 서버 트리(`not-found.tsx`)·클라 트리(`error.tsx`) 양쪽에서 렌더된다. 내부 `<SiteHeader>`만 `'use client'`(인터랙티브)이고, client인 `error.tsx`에 임포트돼도 문제없다.

---

## 4. 모듈 구조

```
src/components/shell/
  Container.tsx     [신규] 순수       1200/24 단일 컨테이너. props { as?, className?, children }
  SiteHeader.tsx    [신규] 'use client'  variant: "light"|"transparent". 로고·데스크톱메뉴·인증CTA·모바일햄버거
  MobileNav.tsx     [신규] 'use client'  Sheet 내부 메뉴(IA 동일). SiteHeader가 768px↓에서 사용
  SiteFooter.tsx    [신규] 순수       footer-light(교회정보+링크열) + legal-band(저작권)
  CtaBand.tsx       [신규] 순수       cta-band-dark "처음 오셨나요?" + CTA 2개
  SiteShell.tsx     [신규] 순수       Header(light)+children+CtaBand?+Footer. props { showCtaBand?=true, children }
src/constants/
  church.ts         [확장]  식별자에 주소·연락처·로고(워드마크) 추가(기존 name·domain·HERO 유지)
  navigation.ts     [신규]  NAV 메뉴 트리 + 푸터 링크열(IA 단일 출처)
  content.ts        [신규]  정적 페이지 본문 + WORSHIP_SERVICES(예배시간, T8 공유) + CTA 카피
src/app/
  layout.tsx        [유지]  변경 없음
  page.tsx          [교체]  보일러플레이트 → 임시 홈(라이트 셸 + 플레이스홀더)
  not-found.tsx     [신규]  서버. SiteShell(showCtaBand=false) + 404
  error.tsx         [신규]  'use client'. unstable_retry + 홈
  global-error.tsx  [신규]  'use client'. 자체 html/body 최후 바운더리
  (site)/
    layout.tsx              [신규]  <SiteShell>{children}</SiteShell>
    about/page.tsx          [신규]  소개
    about/history/page.tsx  [신규]  연혁
    about/vision/page.tsx   [신규]  비전
    about/location/page.tsx [신규]  오시는 길
    worship/page.tsx        [신규]  예배 시간 안내
```

**의존 방향(순환 없음):** `SiteShell → SiteHeader, CtaBand, SiteFooter` · `SiteHeader → MobileNav, navigation, church, ui/Button·DropdownMenu` · 정적 페이지 → `content, church, Container` · `not-found/error → SiteShell, buttonVariants`.

---

## 5. 컴포넌트 명세

### 5.1 `Container` — 순수
- props `{ as?: ElementType; className?: string; children }`. 기본 `as="div"`.
- 클래스: `mx-auto w-full max-w-[var(--container-max)] px-[var(--container-padding)]` + `className` 병합(`cn`).
- 모든 섹션·히어로가 이 컴포넌트를 거쳐 폭/패딩을 공유한다(검수 §8.1).

### 5.2 `SiteHeader` — `'use client'`
- props `{ variant?: "light"|"transparent" }`(기본 light).
- **light**: `bg-canvas text-ink`, 높이 64px, 일반 흐름(콘텐츠를 밀어냄). 1px 하단 헤어라인.
- **transparent**: `fixed inset-x-0 top-0 z-nav bg-transparent`, 텍스트 `text-on-dark`. 메인(14A) 어두운 덮개 위 가독성용.
  - **T07 산출물 경계(명문화)**: transparent variant는 **정적 `fixed + on-dark` 렌더만** 제공한다. 스크롤 상태 훅·배경 전환/블러 클래스는 **T07 범위 밖** — 코드에 `// TODO(T8/T9): 스크롤 진행도 배경 전환` 주석으로 seam만 남긴다(빈 스텁 훅도 두지 않음).
  - **가독성 옵션 보존**: 메인(14A) 밝은 배경 프레임에서는 흰색 고정(`text-on-dark`) 대신 `mix-blend-mode: difference`도 T8이 선택 가능(가이드 14A.5·DESIGN.md). T07은 두 옵션 중 흰색 고정만 기본 제공.
- 구성: 로고(좌, `CHURCH_NAME` 워드마크 `text-primary`, `<Link href="/">`) / 데스크톱 메뉴(중앙·우, `navigation` 소비, `typo.navLink`) / 우측 인증 CTA(로그인·마이페이지) / 768px↓ 햄버거(`lucide-react` Menu) → `<MobileNav>`.
- 데스크톱 드롭다운: 자식 있는 항목(교회소개·소식)은 T4 `DropdownMenu` 재스킨 사용(포털 z-popover). 단일 항목은 `<Link>`.
- 활성 표시: `usePathname()`로 현재 경로 prefix 매칭 → 활성 링크 강조(토큰 색).
- 조건부 렌더는 삼항(`cond ? <X/> : null`), 색=토큰/currentColor, hex·px 인라인 금지.

### 5.3 `MobileNav` — `'use client'`
- T4 `Sheet`(side="right") 재스킨. 트리거는 SiteHeader의 햄버거.
- 내부에 동일 IA 트리(드롭다운 대신 펼친 섹션) + 핵심 CTA(로그인/마이페이지) 유지.
- **닫힘 메커니즘(확정)**: 각 nav `<Link>`를 `SheetClose asChild`로 래핑 → 클릭 즉시 닫힘. 보강으로 `usePathname()` 변경 감지 effect가 `open=false`로 동기화(프로그램적 라우트 전환·뒤로가기 대비). `SheetTitle`은 접근성용.

### 5.4 `SiteFooter` — 순수
- `footer-light`: `bg-canvas`, `typo.bodySm`/`typo.caption`, 상하 64/48 패딩. `<Container>` 내부.
  - 교회 정보(`CHURCH_NAME`·주소·연락처 from `church.ts`) + 링크열(`navigation` FOOTER_COLUMNS).
- `legal-band`: `text-muted`, `typo.caption`. `© {연도} {CHURCH_NAME}` 저작권.

### 5.5 `CtaBand` — 순수
- `cta-band-dark`: `bg-surface-dark`, 상하 `py-section`(96px). `<Container>` 내부.
- 헤드라인 "처음 오셨나요?"(`typo.displayLg` `text-on-dark`) + CTA 2개: 새가족 안내(`buttonVariants("pillCta")` → /about) · 오시는 길(`buttonVariants("outlineOnDark")` → /about/location). 카피는 `content.ts`.
- **헤드라인 토큰 근거**: DESIGN.md 내부에 CTA 밴드 헤드라인이 `display-lg`(cta-band-dark 컴포넌트 정의)와 `display-md`(타이포 위계 표)로 충돌 기재됨 → 더 구체적인 **컴포넌트-레벨 정의(`display-lg`)를 채택**. (DESIGN.md 표/정의 정정은 별건.)
- **새가족 안내 href = `/about` 임시 폴백**: 현재 IA에 새가족 전용 라우트가 없어 소개 페이지로 보낸다. 후속(별도 새가족 페이지 신설 시) 전용 라우트로 교체 예정.

### 5.6 `SiteShell` — 순수
- props `{ showCtaBand?: boolean = true; children }`.
- 구조: `<SiteHeader variant="light" />` → `<main className="flex-1">{children}</main>` → `showCtaBand ? <CtaBand/> : null` → `<SiteFooter/>`.
- `(site)/layout.tsx`와 `not-found.tsx`(showCtaBand=false), `error.tsx`(showCtaBand=false)가 소비.

---

## 6. 라우트 / 네비 IA

### 6.1 디렉터리 (§4 참조)
- `(site)` route group: URL 세그먼트 없음 → `app/(site)/about/page.tsx` = `/about`.
- `app/page.tsx`(메인 `/`)와 `not-found/error/global-error`는 그룹 밖(루트).

### 6.2 메뉴 트리 (`navigation.ts` — IA 단일 출처)

```
교회소개 ▾   소개 /about · 연혁 /about/history · 비전 /about/vision · 오시는 길 /about/location
예배          /worship                         (예배 시간 안내, 정적)
설교          /sermons                         (T10)
소식 ▾       공지 /notices · 일정 /events · 주보 /bulletins · 갤러리 /gallery   (T11·T12·T13·T16)
교육부서      /departments                     (T9)
─ 우측 ─     로그인 /login (T14)  ·  마이페이지 /mypage (T15)
```

- 타입(예시): `NavItem = { label: string; href?: string; children?: NavLink[] }`, `NavLink = { label: string; href: string }`.
- `NAV_PRIMARY: NavItem[]`(교회소개·예배·설교·소식·교육부서), `NAV_AUTH: NavLink[]`(로그인·마이페이지), `FOOTER_COLUMNS`(푸터 링크 그룹).
- 데스크톱: `children` 있으면 DropdownMenu, 없으면 Link. 모바일: 같은 트리를 Sheet에서 펼침.

---

## 7. 콘텐츠 상수 구조 (하드코딩 0)

| 파일 | 내용 |
|---|---|
| `church.ts`(확장) | `CHURCH_NAME`·`CHURCH_DOMAIN`·`HERO`(기존) + `CHURCH_ADDRESS`·`CHURCH_PHONE`·`CHURCH_EMAIL`·(선택)`MAP_EMBED_SRC`. 로고는 `CHURCH_NAME` 워드마크로 표현(별도 이미지 에셋 불필요 — 재색상화 용이). **HERO 미디어 출처(현 church.ts 상수 = 정적 에셋 a안, 답변 E) vs 가이드 13.3의 `NEXT_PUBLIC_HERO_*` env 표기**의 정합은 **T08 범위** — T07은 기존 상수를 건드리지 않는다. |
| `navigation.ts`(신규) | `NAV_PRIMARY`·`NAV_AUTH`·`FOOTER_COLUMNS` |
| `content.ts`(신규) | `WORSHIP_SERVICES: { name, time, place }[]`(예배 시간, T8 메인 섹션과 공유) · `ABOUT_INTRO`·`HISTORY_ITEMS: { year, text }[]`·`VISION_*`·`LOCATION_*`(교통·주소 요약) · `CTA_*`(밴드 카피) |

- 모든 값 샘플로 채우되 배포 시 교체. env 추가 없음(D2).
- `WORSHIP_SERVICES` 시간은 `typo.datetime`(tnum)로 렌더.

---

## 8. 에러 / 404 동작 (Next 16.2)

### 8.1 `app/not-found.tsx` — 서버 컴포넌트
- props 없음. `<SiteShell showCtaBand={false}>` 안에 "페이지를 찾을 수 없습니다"(`typo.displayMd`) + 안내 문구 + 홈으로(`buttonVariants("primary")` → `<Link href="/">`).
- 미매칭 URL + 공개 서버 페이지의 `notFound()`(T06 스펙 §6, 설교·공지 비존재 상세) **둘 다** 이 페이지가 렌더(루트 `not-found`의 전역 catch).
- **상태코드(Next 규약, not-found.md:13)**: **스트림 응답=200 / 비스트림 응답=404**(404 시 `noindex` 자동 주입). 상태코드 단정 테스트는 스트리밍 여부에 의존하므로 §11은 UI 렌더만 게이트로 둔다.
- **EmptyState 미사용 근거**: 이슈 §5는 `EmptyState`(T06) 재사용을 권하나, `EmptyState`는 props `{ message }`의 **목록-빈상태 전용**("등록된 ○○가 없습니다")이라 404/error 라우트 UI엔 부적합 → 직접 마크업 사용(이슈 §5 대비 **의도적 이탈**).

### 8.2 `app/error.tsx` — `'use client'`
- props `{ error: Error & { digest?: string }; unstable_retry: () => void }`.
- `<SiteShell showCtaBand={false}>` 안에 "문제가 발생했습니다"(`typo.displayMd`) + 다시 시도(`unstable_retry()`)·홈으로.
- `useEffect`로 `console.error(error)`(개발 로깅). **스택·민감정보 비노출** — `error.message`/`digest`만 사용, 사용자에겐 일반 문구.
- `reset` 대신 `unstable_retry`(D3).

### 8.3 `app/global-error.tsx` — `'use client'`
- props `{ error; unstable_retry }`. 자체 `<html lang="ko"><body>` 포함(루트 레이아웃 대체).
- globals.css 의존 최소 — 루트가 깨진 상황이므로 최소 인라인 스타일 허용(예외적). "문제가 발생했습니다" + 다시 시도.
- `metadata` export 불가(client) → 필요 시 React `<title>`.

### 8.4 `app/page.tsx` 임시 교체 (D7)
- 보일러플레이트 제거. `<SiteShell>` + 간단 플레이스홀더("홈 — T08 CrossHero 예정"). 주석으로 T08 대체 명시. 셸 동작 검증용.
- **교체 시 규칙 준수**: 기존 보일러플레이트의 arbitrary value(`hover:bg-[#383838]`·`md:w-[158px]` 등)·`dark:` 클래스·next/vercel 로고를 **전부 제거**하고 토큰 유틸만 사용(CLAUDE.md hex·px 인라인 금지, DESIGN.md 다크모드 1차 제외).

---

## 9. 데이터 흐름

- **표준 페이지**: `(site)/layout.tsx` → `<SiteShell>` → 라이트 네비 + 페이지 콘텐츠 + 프리푸터 + 푸터. 정적 페이지는 `content.ts`/`church.ts` 상수만 소비(패칭 없음).
- **메인/부서**(T8/T9): 그룹 밖에서 `<SiteHeader variant="transparent">` + 히어로 + 섹션 + `<CtaBand/>` + `<SiteFooter/>` 직접 합성. T07은 컴포넌트만 제공.
- **404/error**: 셸을 직접 합성(레이아웃 상속 불가). `handleApiError`(T06, 토스트)는 호출하지 않음 — 라우트 레벨 페이지다(이슈 §5 구분).
- **네비 활성/모바일**: client island(`SiteHeader`/`MobileNav`)가 `usePathname`·Sheet 상태 관리.

---

## 10. 의존성 · 문서 변경

**prod 추가:** 없음(T3/T4/T6 컴포넌트 + lucide-react 재사용).
**문서:**
- `.issues/T07-app-shell.md` §6 문구 "env 주입" → "상수 파일(`church.ts`) 주입"으로 완화(D2), §5 `error.tsx` `reset` → `unstable_retry`(D3) 반영.
- `globals.css`: 필요 시 투명 네비 블러 유틸 정도만(가급적 기존 토큰으로 해결, 추가 최소화).

---

## 11. 테스트 계획 (TDD · 80%+ · vitest + testing-library)

| 파일 | 검증 항목 |
|---|---|
| `Container.test.tsx` | max-w/px 토큰 클래스 적용, `as`·`className` 병합 |
| `SiteHeader.test.tsx` | `NAV_PRIMARY` 링크 렌더, 활성 경로 강조, variant별 클래스(light=흐름/transparent=fixed z-nav on-dark), 로고 `/` 링크, 768↓ 햄버거→Sheet 토글. **transparent는 정적 렌더만**(스크롤 상태 전환 assertion 없음 — T07 범위 밖 확인) |
| `MobileNav.test.tsx` | Sheet 열림/닫힘, IA 트리 + 인증 CTA 존재, 항목 클릭 시 닫힘(`SheetClose`), **경로(prefix) 변경 시 `open=false` 동기화** |
| `SiteFooter.test.tsx` | 교회정보(name·주소·연락처) + 링크열 + 저작권 렌더(상수 출처) |
| `CtaBand.test.tsx` | 헤드라인 + CTA 2개 href(/about·/about/location) |
| `SiteShell.test.tsx` | Header+main+Footer 합성, `showCtaBand` 토글 |
| `not-found.test.tsx` | 404 문구 + 홈복귀 링크, 셸(Header/Footer) 포함, CtaBand 없음 |
| `error.test.tsx` | "문제가 발생했습니다" + 다시시도 클릭이 `unstable_retry` 호출, **`error.stack` 미렌더**(민감정보 비노출) |
| 정적 5페이지 | about/history/vision/location/worship가 `content.ts` 상수 콘텐츠 렌더(스모크 + 핵심 문구 존재) |

---

## 12. 검수 기준 (이슈 §8 매핑)

- [ ] 모든 섹션·히어로가 `<Container>`(1200/24) 하나를 공유한다.
- [ ] 히어로 위 투명 네비가 어두운 배경에서 `text-on-dark`로 가독성 유지(T07은 정적 `fixed + on-dark`만 — 스크롤 전환은 T8/T9). 메인 밝은 프레임용 `mix-blend-mode: difference` 옵션은 T8 선택지로 보존.
- [ ] 768px 미만에서 햄버거 Sheet 전환 + 핵심 CTA(로그인/마이페이지) 유지.
- [ ] 교회 이름/로고/주소/연락처가 `church.ts` 상수 주입이며 하드코딩 0(매직스트링 0).
- [ ] 존재하지 않는 URL 접근 시 기본 Next 404가 아니라 셸(네비·푸터) 위 커스텀 404가 뜨고 홈 복귀 동작.
- [ ] 공개 상세에서 `notFound()` 호출 시 동일 404 페이지 렌더(루트 not-found 전역 catch).
- [ ] `error.tsx`가 `unstable_retry`로 재시도, 스택/민감정보 비노출.
- [ ] `pnpm build`·`pnpm lint`·`pnpm test`(커버리지 80%+) 통과. 정적 페이지 prerender에서 빌드 실패 없음.

---

## 13. 범위 밖 (Out of Scope)

- **CrossHero(14A)·DeptHero(14B) 실제 구현** — T8/T9. T07은 `SiteHeader` 투명 variant의 **정적 `fixed + on-dark` 렌더만** 제공한다. 스크롤 상태 훅/스텁은 두지 않고 `// TODO(T8/T9)` 주석 seam만 남긴다(§5.2와 일치).
- 도메인 데이터 패칭·목록/상세 페이지(T10~T16).
- 인증 UI(로그인·가입 폼 — T14), 마이페이지(T15), 갤러리(T16) — T07은 라우트 링크만 IA에 노출.
- 실제 지도 SDK(라이브러리 금지) — 임베드/외부 링크로 대체(D10).
- 어드민 화면(DESIGN.md Known Gaps).
- `global-not-found.tsx`(D6 — 제외).
