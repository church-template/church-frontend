---
version: 1.0
name: church-design-system
description: 교회 홈페이지 템플릿의 디자인 시스템. Coinbase의 디자인 언어(차분한 단일 블루 액센트, 흰 캔버스, 400 굵기의 절제된 디스플레이 타이포, 카드 레이어링 기반의 깊이)를 베이스로 교회 콘텐츠에 맞게 재해석했다. 흰 캔버스 위에 브랜드 블루(#0052ff) 하나만 절제해서 쓰고, 페이지 리듬은 흰 섹션 ↔ 연회색 밴드 ↔ 풀블리드 다크/미디어 히어로의 교차로 만든다. 신뢰감과 따뜻함, 그리고 설교·공지·일정 등 텍스트 콘텐츠의 가독성이 최우선이다.

colors:
  # primary는 교회별로 교체 가능한 유일한 브랜드 토큰이다 (§프로젝트 규칙 참고)
  primary: "#0052ff"
  primary-active: "#003ecc"
  primary-disabled: "#a8b8cc"
  primary-soft: "#e8efff"          # 블루 틴트 배경 (배지, 선택 상태)
  ink: "#0a0b0d"
  body: "#5b616e"
  body-strong: "#0a0b0d"
  muted: "#7c828a"
  muted-soft: "#a8acb3"
  hairline: "#dee1e6"
  hairline-soft: "#eef0f3"
  canvas: "#ffffff"
  surface-soft: "#f7f7f7"
  surface-card: "#ffffff"
  surface-strong: "#eef0f3"
  surface-dark: "#0a0b0d"
  surface-dark-elevated: "#16181c"
  cover-dark: "#0a0f1f"            # 메인 십자가 덮개색 (가이드 14A. CrossHero)
  on-primary: "#ffffff"
  on-dark: "#ffffff"
  on-dark-soft: "#a8acb3"
  semantic-success: "#05b169"      # 폼 성공 메시지 전용 (텍스트 색으로만)
  semantic-error: "#cf202f"        # 폼 오류 메시지 전용 (텍스트 색으로만)

typography:
  # 모든 폰트는 Pretendard 단일 패밀리다. display/body 구분은 굵기·크기·자간으로만 만든다.
  # 한글 디스플레이는 라틴과 달리 400이 빈약해 보이므로 500을 기준으로 한다 (원본 Coinbase 원칙의 한글 보정).
  display-mega:
    fontFamily: "'Pretendard Variable', Pretendard, -apple-system, system-ui, 'Apple SD Gothic Neo', sans-serif"
    fontSize: 72px
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: -0.02em
  display-xl:
    fontFamily: "'Pretendard Variable', Pretendard, sans-serif"
    fontSize: 56px
    fontWeight: 500
    lineHeight: 1.18
    letterSpacing: -0.02em
  display-lg:
    fontFamily: "'Pretendard Variable', Pretendard, sans-serif"
    fontSize: 44px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: -0.02em
  display-md:
    fontFamily: "'Pretendard Variable', Pretendard, sans-serif"
    fontSize: 36px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: -0.01em
  display-sm:
    fontFamily: "'Pretendard Variable', Pretendard, sans-serif"
    fontSize: 30px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: -0.01em
  title-lg:
    fontFamily: "'Pretendard Variable', Pretendard, sans-serif"
    fontSize: 26px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.01em
  title-md:
    fontFamily: "'Pretendard Variable', Pretendard, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  title-sm:
    fontFamily: "'Pretendard Variable', Pretendard, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  body-md:
    fontFamily: "'Pretendard Variable', Pretendard, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: 0
  body-strong:
    fontFamily: "'Pretendard Variable', Pretendard, sans-serif"
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.7
    letterSpacing: 0
  body-sm:
    fontFamily: "'Pretendard Variable', Pretendard, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  caption:
    fontFamily: "'Pretendard Variable', Pretendard, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  caption-strong:
    fontFamily: "'Pretendard Variable', Pretendard, sans-serif"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: 0.02em
  datetime:
    fontFamily: "'Pretendard Variable', Pretendard, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
    fontFeature: tnum            # 날짜·시간·절기 숫자는 tabular numerals로
  button:
    fontFamily: "'Pretendard Variable', Pretendard, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: 0
  nav-link:
    fontFamily: "'Pretendard Variable', Pretendard, sans-serif"
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0

rounded:
  none: 0px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px        # 카드 표준 라운드. DeptHero(14B) 카드 모서리(24px)와 동일 토큰
  pill: 100px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  base: 16px
  md: 20px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px

layout:
  container-max: 1200px    # 히어로(14A/14B)·본문 섹션이 공유하는 컨테이너 폭
  container-padding: 24px  # 히어로(14A/14B)·본문 섹션이 공유하는 좌우 패딩
  nav-height: 64px

components:
  top-nav-light:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    height: "{layout.nav-height}"
  top-nav-transparent:
    # 히어로 위에 얹히는 투명 네비. position fixed, z-index 10
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    height: "{layout.nav-height}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 12px 20px
    height: 44px
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
  button-secondary-light:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 12px 20px
    height: 44px
  button-outline-on-dark:
    backgroundColor: transparent
    textColor: "{colors.on-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 11px 19px
    height: 44px
  button-tertiary-text:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.button}"
  button-pill-cta:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 16px 32px
    height: 56px
  sermon-card:
    # 설교 카드: 썸네일 + 제목 + 설교자 + 날짜
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    rounded: "{rounded.xl}"
    padding: 0
    border: "1px solid {colors.hairline}"
  notice-row:
    # 공지 목록 행: 제목 + 날짜, 1px 헤어라인 구분
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    padding: 16px 0
  schedule-card:
    # 예배 시간 안내 카드: 예배명 + 시간 + 장소
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: 32px
  event-card:
    # 행사/일정 카드
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    rounded: "{rounded.xl}"
    padding: 32px
    border: "1px solid {colors.hairline}"
  feature-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    rounded: "{rounded.xl}"
    padding: 32px
  cta-band-dark:
    # 프리푸터 밴드: "처음 오셨나요?" 새가족 안내 등
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.display-lg}"
    padding: 96px
  badge-pill:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  badge-pill-primary:
    # "NEW", "이번 주" 등 강조 배지
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 14px 16px
    height: 48px
    border: "1px solid {colors.hairline}"
  search-input-pill:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.pill}"
    padding: 12px 20px
    height: 44px
  footer-light:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body}"
    typography: "{typography.body-sm}"
    padding: 64px 48px
  legal-band:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
---

## 개요 (Overview)

이 시스템은 "조용히 신뢰를 주는" 톤을 목표로 한다. 흰 캔버스 위에 브랜드 블루
(`{colors.primary}`) 하나만 절제해서 쓰고, 깊이는 그림자가 아니라 카드 레이어링과
헤어라인으로 만든다. 페이지 리듬은 세 가지 밴드의 교차다:
흰 섹션 → 연회색 밴드(`{colors.surface-soft}`) → 풀블리드 미디어/다크 밴드.

**핵심 성격:**
- 단일 액센트: `{colors.primary}` 는 기본 CTA, 로고, 인라인 링크에만 쓴다. 희소할수록 강하다.
- 절제된 디스플레이: 헤드라인은 굵기 500. 700 이상으로 키우지 않는다 — 차분함이 브랜드 보이스다.
- 필 지오메트리: 모든 CTA는 `{rounded.pill}`, 모든 카드는 `{rounded.xl}`(24px). 직각 모서리는 쓰지 않는다.
- 96px 섹션 리듬: 에디토리얼한 여백 호흡. 밀도보다 호흡이 우선이다.
- 사진/영상이 주인공: 히어로와 카드 썸네일이 분위기를 만들고, UI 크롬은 조용히 받친다.

## 프로젝트 규칙 (Project Rules) — 가장 먼저 읽을 것

1. **교회별 브랜드 컬러 교체**: `{colors.primary}` 계열 4개 토큰(primary, primary-active,
   primary-disabled, primary-soft)만 교체하면 다른 교회에 재사용할 수 있어야 한다.
   이외의 어떤 곳에도 파란색 hex를 인라인으로 박지 않는다. 기본값은 #0052ff.
2. **폰트는 Pretendard 하나**: 모든 텍스트는 Pretendard Variable. CDN 또는 next/font로
   self-host. 라틴 전용 폰트를 추가하지 않는다.
3. **히어로 연동**: 메인 히어로는 십자가 열쇠구멍 연출(가이드 `14A. CrossHero`),
   부서 소개 페이지 히어로는 카드 확장 연출(가이드 `14B. DeptHero`)을 따른다.
   디자인 토큰과의 연결점 — 컨테이너 폭 `{layout.container-max}`(1200px),
   좌우 패딩 `{layout.container-padding}`(24px), 카드 모서리 `{rounded.xl}`(24px, 14B),
   히어로 오버레이 카피 `{typography.display-lg}` + `{colors.on-dark}`,
   메인 덮개 색 `{colors.cover-dark}`(14A).
4. **토큰 참조 강제**: 컴포넌트 구현 시 hex·px를 인라인으로 쓰지 말고 반드시
   CSS 변수(또는 Tailwind theme 확장)로 노출된 토큰을 참조한다.
5. **콘텐츠는 API에서**: 텍스트·이미지·영상 등 모든 콘텐츠는 백엔드 API에서 주입된다.
   디자인 시스템에 특정 교회의 이름·문구를 하드코딩하지 않는다.

## 색 (Colors)

### 브랜드
- **Primary** (`{colors.primary}`): 유일한 액션 컬러. 기본 CTA 필, 로고, 인라인 링크.
- **Primary Active** (`{colors.primary-active}`): 프레스 상태.
- **Primary Soft** (`{colors.primary-soft}`): 블루 틴트 배경 — 강조 배지, 선택 상태, 캘린더의 오늘 표시.

### 서피스
- **Canvas** (`{colors.canvas}`): 기본 페이지 바닥.
- **Surface Soft** (`{colors.surface-soft}`): 교차 밴드, 예배시간 카드 배경.
- **Surface Strong** (`{colors.surface-strong}`): 보조 버튼, 검색 필, 배지의 회색 채움.
- **Surface Dark** (`{colors.surface-dark}`): 프리푸터 CTA 밴드, 다크 히어로.
- **Surface Dark Elevated** (`{colors.surface-dark-elevated}`): 다크 밴드 위에 뜨는 카드.

### 텍스트
- **Ink** (`{colors.ink}`): 헤드라인, 네비, 본문 강조.
- **Body** (`{colors.body}`): 기본 본문 — 약간 차가운 회색.
- **Muted** (`{colors.muted}`): 날짜, 부제, 푸터 보조.

### 시맨틱 (폼 전용)
- **Success** (`{colors.semantic-success}`) / **Error** (`{colors.semantic-error}`):
  폼 검증 메시지의 텍스트 색으로만 쓴다. 배경 채움·버튼 색으로 쓰지 않는다.

## 타이포그래피 (Typography)

### 원칙
- **디스플레이 굵기는 500.** 원본(Coinbase)은 400이지만 한글은 같은 굵기에서 라틴보다
  가늘어 보이므로 500으로 보정했다. 600 이상으로 올리지 않는다.
- **자간은 em 단위.** 디스플레이만 -0.01 ~ -0.02em의 미세한 음수 자간, 본문은 0.
- **본문 행간 1.7.** 한글 장문(설교 본문, 공지)의 가독성 기준. 라틴 기준(1.5)보다 넉넉하게.
- **날짜·시간 숫자는 `{typography.datetime}`** — `font-feature-settings: "tnum"` 으로
  자릿수가 흔들리지 않게 한다 (예배 시간표, 일정 캘린더에서 중요).

### 위계
| 토큰 | 크기 | 굵기 | 용도 |
|---|---|---|---|
| `{typography.display-mega}` | 72px | 500 | 페이지 대표 헤드라인 |
| `{typography.display-xl}` | 56px | 500 | 서브 페이지 히어로 |
| `{typography.display-lg}` | 44px | 500 | 섹션 헤드, 히어로 오버레이 카피 |
| `{typography.display-md}` | 36px | 500 | CTA 밴드 헤드라인 |
| `{typography.title-lg}` | 26px | 600 | 카드 그룹 타이틀 |
| `{typography.title-md}` | 18px | 600 | 카드 제목, 목록 제목 |
| `{typography.body-md}` | 16px | 400 | 기본 본문 (행간 1.7) |
| `{typography.body-sm}` | 14px | 400 | 보조 본문, 푸터 |
| `{typography.datetime}` | 14px | 500 | 날짜·시간 (tnum) |
| `{typography.caption}` | 13px | 400 | 캡션 |
| `{typography.button}` | 16px | 600 | CTA |
| `{typography.nav-link}` | 15px | 500 | 네비 메뉴 |

모바일에서 디스플레이는 단계적으로 줄인다: 72 → 56 → 44 → 36 → 30px.
구현은 `clamp()` 권장 (예: `clamp(36px, 6vw, 72px)`).

## 레이아웃 (Layout)

- **컨테이너**: 최대 `{layout.container-max}`(1200px) 가운데 정렬,
  좌우 패딩 `{layout.container-padding}`(24px). **사이트의 모든 섹션과 히어로(14A/14B)가
  이 하나의 컨테이너 규칙을 공유한다** — 별도의 폭을 만들지 않는다.
- **섹션 패딩**: 상하 `{spacing.section}`(96px). 모바일에서는 64px로 축소.
- **카드 내부 패딩**: `{spacing.xl}`(32px).
- **그리드**: 설교/행사 카드 데스크톱 3-up, 태블릿 2-up, 모바일 1-up.

## 깊이 (Elevation)

| 단계 | 처리 | 용도 |
|---|---|---|
| Flat | 그림자·보더 없음 | 서피스의 80% |
| Hairline | 1px `{colors.hairline}` | 카드 외곽선 |
| Soft drop | `0 4px 12px rgba(0,0,0,0.04)` | 호버된 카드 — 유일한 그림자 단계 |
| Photographic | 풀블리드 사진/영상 | 히어로의 깊이 |

그림자 단계를 추가하지 않는다. 깊이가 더 필요하면 다크 밴드 위 elevated 카드 패턴을 쓴다.

## 모양 (Shapes)

- 인터랙티브(버튼, 검색, 배지) = `{rounded.pill}`
- 컨테이너(카드) = `{rounded.xl}` (24px)
- 폼 입력 = `{rounded.md}` (12px)
- 아바타·아이콘 플레이트 = `{rounded.full}`
- 직각(0px)은 사용하지 않는다.

## 컴포넌트 (Components)

### 네비게이션
- **`top-nav-light`**: 서브 페이지 기본. 흰 배경, ink 텍스트, 64px.
  로고 좌측 / 메뉴(교회소개·예배·설교·소식·교육부서 등) 중앙 또는 우측.
- **`top-nav-transparent`**: 히어로 위(메인·부서). `position: fixed; z-index: 10`, 투명 배경.
  메인(14A)은 어두운 덮개 위에 얹히므로 흰색 텍스트 또는 `mix-blend-mode: difference`로 가독성을 확보한다.
  부서(14B)는 카드가 풀스크린으로 전환된 뒤 진행도에 따라 텍스트를 `{colors.on-dark}`로
  전환하거나 반투명 블러 배경을 더한다.

### 버튼
- **`button-primary`**: 시그니처 블루 필. 44px 높이. 한 화면(밴드)에 1개가 원칙.
- **`button-pill-cta`**: 히어로·CTA 밴드용 56px 대형 필 ("새가족 안내", "오시는 길").
- **`button-secondary-light`** / **`button-outline-on-dark`** / **`button-tertiary-text`**: 보조 위계.

### 콘텐츠 카드
- **`sermon-card`**: 16:9 썸네일(상단, 라운드는 카드와 함께 24px) + 제목
  `{typography.title-md}` + 설교자·날짜 `{typography.datetime}` `{colors.muted}`.
  호버 시 soft drop + 썸네일 1.03배 줌(0.3s ease).
- **`notice-row`**: 제목 + 날짜의 가로 행, 1px 헤어라인 구분. 클릭 영역은 행 전체.
- **`schedule-card`**: `{colors.surface-soft}` 배경. 예배명 `{typography.title-md}` +
  시간 `{typography.datetime}` + 장소 `{typography.body-sm}`.
- **`event-card`**: 행사 카드. 날짜 배지(`badge-pill-primary`) + 제목 + 요약.

### 밴드
- **`cta-band-dark`**: 프리푸터. "처음 오셨나요?" 헤드라인 `{typography.display-lg}` +
  CTA 2개(primary + outline-on-dark). 상하 96px.

### 폼
- **`text-input`**: 12px 라운드, 포커스 시 보더 2px `{colors.primary}`.
- 검증 메시지는 입력 아래 `{typography.caption}`, 색은 semantic 토큰.

## Do / Don't

### Do
- `{colors.primary}`는 밴드당 한두 번만 등장시킨다.
- 모든 CTA는 필, 모든 카드는 24px 라운드.
- 디스플레이 굵기 500 유지.
- 흰 섹션 ↔ 회색 밴드 ↔ 다크/미디어 밴드의 교차로 페이지 리듬을 만든다.
- 날짜·시간엔 항상 `{typography.datetime}` (tnum).
- 본문 행간 1.7 유지.

### Don't
- 두 번째 브랜드 컬러를 도입하지 않는다.
- 디스플레이를 700+로 볼드하지 않는다.
- 그림자 단계를 추가하지 않는다.
- CTA에 직각 모서리를 쓰지 않는다.
- semantic success/error를 버튼·배경 색으로 쓰지 않는다.
- hex·px를 인라인으로 쓰지 않는다 — 항상 토큰 참조.

## 반응형 (Responsive)

| 구간 | 폭 | 변화 |
|---|---|---|
| Mobile | < 640px | 히어로 h1 72→36px, 카드 1-up, 네비 햄버거, 섹션 패딩 64px |
| Tablet | 640–1024px | 히어로 h1 56px, 카드 2-up |
| Desktop | 1024–1280px | 히어로 h1 72px, 카드 3-up |
| Wide | > 1280px | 콘텐츠 1200px 캡, 히어로 미디어만 풀블리드 |

- 터치 타깃: 기본 CTA 44px, 히어로 CTA 56px (WCAG AAA).
- 네비는 768px 미만에서 햄버거 시트로 전환, 핵심 CTA는 유지.

## 구현 노트 (Implementation Notes)

1. 토큰은 `app/globals.css`의 CSS 변수로 1차 노출하고, Tailwind 사용 시
   `theme.extend`에서 변수를 참조하게 연결한다 (값 중복 정의 금지).
2. Pretendard는 next/font/local 또는 공식 CDN으로 로드하고
   `font-feature-settings`를 datetime 토큰에만 적용한다.
3. 다크 밴드·히어로 덮개 안의 텍스트는 반드시 on-dark 계열 토큰을 쓴다 — canvas 토큰 재사용 금지.
4. 새 컴포넌트가 필요하면 이 문서의 `components:` 블록에 항목을 추가한 뒤 구현한다.
   문서에 없는 컴포넌트를 임의 스타일로 만들지 않는다.

## 한계 (Known Gaps)

- 관리자(어드민) 화면의 디자인은 본 문서 범위 밖이다. 어드민은 가독성 우선의
  단순 변형을 쓰되 토큰은 공유한다.
- 애니메이션 타이밍은 히어로 명세(가이드 14A/14B) 외에는 미정의. 기본값: 0.2~0.3s ease.
- 다크 모드는 1차 범위에서 제외한다.
