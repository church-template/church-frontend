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
    rounded: "{rounded.lg}"     # 16px — 배지(8)의 ×2, 중첩 라디우스 원칙
    padding: 12px 20px
    height: 44px
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
  button-secondary-light:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.lg}"
    padding: 12px 20px
    height: 44px
  button-outline-on-dark:
    backgroundColor: transparent
    textColor: "{colors.on-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.lg}"
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
    rounded: "{rounded.lg}"     # 16px — 이름의 pill은 레거시, 모양은 lg
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
  bulletin-row:
    # 주보 행: 제목 + 예배일 + 작성자(선택), 행 전체가 새 탭 PDF 링크
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.title-sm}"
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
    rounded: "{rounded.sm}"     # 8px — 작은 칩까지 풀필이면 템플릿 인상이 강해 배지만 낮춘다
    padding: 4px 12px
  badge-pill-primary:
    # "NEW", "이번 주" 등 강조 배지
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.sm}"     # 8px — badge-pill과 동일
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
- 중첩 라디우스 원칙: **외부 라디우스 ≈ 내부 라디우스 × 2.** 배지 8 ↔ 버튼 16, 입력 12 ↔ 카드 24.
  CTA는 `{rounded.lg}`(16px), 카드는 `{rounded.xl}`(24px). 직각 모서리는 쓰지 않는다.
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
- **Primary On Dark** (`{colors.primary-on-dark}`): 다크 밴드 위 액센트(#0052ff는 다크 위 대비 부족) — `challenge-today-band` 전용.

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
  단, **파괴적 확인 버튼**(회원 탈퇴 등)에 한해 `error`(CSS `--color-error` / 유틸 `bg-error`)를 채움색으로 쓸 수 있다(`button-destructive`).

## 타이포그래피 (Typography)

### 원칙
- **디스플레이 굵기는 500.** 원본(Coinbase)은 400이지만 한글은 같은 굵기에서 라틴보다
  가늘어 보이므로 500으로 보정했다. 600 이상으로 올리지 않는다.
- **자간은 em 단위.** 디스플레이만 -0.01 ~ -0.02em의 미세한 음수 자간, 본문은 0.
- **본문 행간 1.7.** 한글 장문(설교 본문, 공지)의 가독성 기준. 라틴 기준(1.5)보다 넉넉하게.
- **본문 20px·보조 18px.** 주 사용자층(고령 교인)의 가독성 기준으로 일반 웹 기본(16/14)보다 두 단계 키운 스케일이다. 15px 미만 텍스트는 쓰지 않는다.
- **날짜·시간 숫자는 `{typography.datetime}`** — `font-feature-settings: "tnum"` 으로
  자릿수가 흔들리지 않게 한다 (예배 시간표, 일정 캘린더에서 중요).

### 위계
| 토큰 | 크기 | 굵기 | 용도 |
|---|---|---|---|
| `{typography.display-mega}` | 72px | 500 | 페이지 대표 헤드라인 |
| `{typography.display-xl}` | 56px | 500 | 서브 페이지 히어로 |
| `{typography.display-lg}` | 44px | 500 | 섹션 헤드, 히어로 오버레이 카피 |
| `{typography.display-md}` | 36px | 500 | CTA 밴드 헤드라인 |
| `{typography.title-lg}` | 30px | 600 | 카드 그룹 타이틀 |
| `{typography.title-md}` | 22px | 600 | 카드 제목, 목록 제목 |
| `{typography.title-sm}` | 20px | 600 | 목록 행 제목 (notice-row·bulletin-row) |
| `{typography.body-md}` | 20px | 400 | 기본 본문 (행간 1.7) |
| `{typography.body-lg}` | 24px | 400 | 읽는 본문 강조 (소망·이야기 등 장문, 행간 1.7) |
| `{typography.body-lg-strong}` | 28px | 700 | 읽는 본문 내 의미 구절 인라인 강조 (소망 4색 구절, 행간 1.45로 body-lg 줄높이 유지) |
| `{typography.body-sm}` | 18px | 400 | 보조 본문, 푸터 |
| `{typography.datetime}` | 18px | 500 | 날짜·시간 (tnum) |
| `{typography.caption}` | 16px | 400 | 캡션 |
| `{typography.button}` | 20px | 600 | CTA |
| `{typography.nav-link}` | 21px | 500 | 네비 메뉴 |

모바일에서 디스플레이는 단계적으로 줄인다: 72 → 56 → 44 → 36 → 30px.
구현은 `clamp()` 권장 (예: `clamp(36px, 6vw, 72px)`).

## 레이아웃 (Layout)

- **컨테이너**: 최대 `{layout.container-max}`(1200px) 가운데 정렬,
  좌우 패딩 `{layout.container-padding}`(24px). **사이트의 모든 섹션과 히어로(14A/14B)가
  이 하나의 컨테이너 규칙을 공유한다** — 별도의 폭을 만들지 않는다.
- **섹션 패딩**: 상하 `{spacing.section}`(96px). 모바일에서는 64px로 축소.
- **카드 내부 패딩**: `{spacing.xl}`(32px).
- **그리드**: 설교/행사 카드 데스크톱 3-up, 태블릿 2-up, 모바일 1-up.
- **라이트박스 폭**: `--container-lightbox`(64rem) — 갤러리 사진 라이트박스(`PhotoLightbox`)가 기본 모달 폭(`--container-modal` 32rem)을 덮어쓸 때 쓰는 폭 토큰.

## 레이어링 (z-index)

portal로 뜨는 동작 컴포넌트(Modal·Sheet·Popover·Select·Dropdown·Toast)는 고정 네비
(`top-nav-transparent`, z 10) **위에** 렌더되어야 한다. z 스케일은 globals.css `--z-*` 토큰으로
단일 정의하고 `z-nav`/`z-popover`/`z-overlay`/`z-toast` 유틸로 참조한다(인라인 z-index 금지).

| 레이어 | z | 대상 |
|---|---|---|
| nav | 10 | `top-nav-transparent` |
| popover | 40 | Popover · DropdownMenu · Select · Tabs content |
| overlay | 50 | Dialog · Sheet 의 overlay + content |
| toast | 60 | sonner `<Toaster />` (항상 최상위) |

## 깊이 (Elevation)

| 단계 | 처리 | 용도 |
|---|---|---|
| Flat | 그림자·보더 없음 | 서피스의 80% |
| Hairline | 1px `{colors.hairline}` | 카드 외곽선 |
| Soft drop | `0 4px 12px rgba(0,0,0,0.04)` | 호버된 카드 — 유일한 그림자 단계 |
| Photographic | 풀블리드 사진/영상 | 히어로의 깊이 |

그림자 단계를 추가하지 않는다. 깊이가 더 필요하면 다크 밴드 위 elevated 카드 패턴을 쓴다.

## 모양 (Shapes)

**중첩 라디우스 원칙: 외부 라디우스 ≈ 내부 라디우스 × 2.** 안에 들어가는 요소의 라운드를
절반으로 줄이면 모서리 곡률이 평행하게 보인다. 새 요소의 라운드는 이 중첩 관계로 정한다.

- 배지·칩 = `{rounded.sm}` (8px) — 작은 칩까지 풀필이면 템플릿 인상이 강해진다
- 폼 입력 = `{rounded.md}` (12px)
- 버튼·CTA = `{rounded.lg}` (16px) — 배지(8)의 ×2
- 컨테이너(카드) = `{rounded.xl}` (24px) — 입력(12)의 ×2
- 검색 필 = `{rounded.pill}` — 유일하게 남는 필(검색임을 즉시 알리는 형태 액센트)
- 아바타·아이콘 플레이트 = `{rounded.full}`
- 직각(0px)은 사용하지 않는다.

## 컴포넌트 (Components)

### 네비게이션
- **`top-nav-light`**: 서브 페이지 기본. 흰 배경, ink 텍스트, 80px.
  로고 좌측 / 메뉴(교회안내·예배·설교·소식·교육부서 등) 중앙 또는 우측.
- **`top-nav-transparent`**: 히어로 위(메인·부서). `position: fixed; z-index: 10`, 투명 배경.
  메인(14A)은 어두운 덮개 위에 얹히므로 흰색 텍스트 또는 `mix-blend-mode: difference`로 가독성을 확보한다.
  부서(14B)는 카드가 풀스크린으로 전환된 뒤 진행도에 따라 텍스트를 `{colors.on-dark}`로
  전환하거나 반투명 블러 배경을 더한다.
- **`mega-menu`**: 데스크톱 GNB(참조: 우리은행). 1뎁스 호버/포커스 시 헤더 아래 풀폭 캔버스
  패널이 펼쳐지고 전 카테고리가 컬럼으로 표시된다. 행 = 아이콘 플레이트(`{rounded.full}` 40px,
  `primary-soft` 틴트 단일 — 다색 금지) + lucide 아이콘(20px, `currentColor`=primary) + 라벨.
  닫힘: mouseleave·Esc·링크 클릭. 모바일은 햄버거 시트 유지.

### 버튼
- **`button-primary`**: 시그니처 블루 필. 48px 높이. 한 화면(밴드)에 1개가 원칙.
- **`button-pill-cta`**: 히어로·CTA 밴드용 56px 대형 필 ("새가족 안내", "오시는 길").
- **`button-secondary-light`** / **`button-outline-on-dark`** / **`button-tertiary-text`**: 보조 위계.
- **`button-destructive`**: 파괴적 확인(회원 탈퇴 등) 전용 빨강 필(`bg-error` / hover `bg-error-active` / 텍스트 `on-error`). 48px. 페이지 트리거가 아니라 **모달의 확정 버튼**에만 쓴다. 친화 장치는 색이 아니라 비밀번호 재인증·경고문이다.
- **`button-kakao`** / **`button-naver`**: 외부 지도 "…에서 보기" 버튼 전용(오시는 길). 각 서비스 공식 채움색(카카오 `bg-kakao`+검정 글자 / 네이버 `bg-naver`+흰 글자, hover·press는 `brightness`로 절제). **단일 액센트 원칙의 의도적 예외** — 제3자 브랜드라 교회 팔레트가 아니며 이 두 버튼 외엔 쓰지 않는다. 토큰: globals.css `--color-kakao`·`--color-kakao-ink`·`--color-naver`·`--color-naver-on`.

### 콘텐츠 카드
- **`sermon-card`**: 16:9 썸네일(상단, 라운드는 카드와 함께 24px) + 제목
  `{typography.title-md}` + 설교자·날짜 `{typography.datetime}` `{colors.muted}`.
  호버 시 soft drop + 썸네일 1.03배 줌(0.3s ease).
- **`notice-row`**: 제목 + 날짜의 가로 행, 1px 헤어라인 구분. 클릭 영역은 행 전체.
- **`bulletin-row`**: 주보 행(notice-row 변형). 제목 `{typography.title-sm}` + 예배일
  `{typography.datetime}` `{colors.muted}` + 작성자 `{typography.body-sm}` `{colors.muted}`(없으면 줄 생략).
  행 전체가 새 탭 PDF 링크(`GET /api/media/{id}`), 1px 헤어라인 구분, hover 시 제목 primary 전이.
- **`schedule-card`**: `{colors.surface-soft}` 배경. 예배명 `{typography.title-md}` +
  시간 `{typography.datetime}` + 장소 `{typography.body-sm}`.
- **`event-card`**: 행사 카드. 날짜 배지(`badge-pill-primary`) + 제목 + 요약.

### 밴드
- **`cta-band-dark`**: 프리푸터. "처음 오셨나요?" 헤드라인 `{typography.display-lg}` +
  CTA 2개(primary + outline-on-dark). 상하 96px.

### 연출
- **`media-collage`**: 메인 히어로(14A) 직후의 스크럽 섹션. 풀스크린 미디어(히어로와 동일)가
  `clip-path: inset(... round {rounded.xl})`로 중앙 카드로 축소되고, 주변 타일(데스크톱 4·
  모바일 2, `{rounded.xl}` + hairline)이 가장자리에서 슬라이드 인해 캔버스 위 콜라주를 만든다.
  transform/clip-path/opacity만 사용(reflow 금지), reduced-motion은 완성 콜라주 정적 표시.
  슬롯 기하·구간 수치는 스펙(docs/superpowers/specs/2026-06-11-media-collage-design.md §4)이 단일 진실.
- **`history-band`**: 연혁 카드 시퀀스(참조: 우리은행 Dream). 연도 배지 + 헤드라인 + 설명의
  풀폭 라운드 밴드(`{rounded.xl}`)가 세로로 이어지고, 배경은 surface-dark·primary-soft·
  surface-soft 토큰 교차(브랜드 3색 직역 금지 — 단일 액센트 원칙). 뷰포트 진입 시 1회
  fade+slide-up(Reveal, 스태거 120ms).
- **`history-editorial-grid`**: 연혁 페이지(`/about/history`) 챕터 그리드(참조: 카카오 지속가능성).
  챕터 = 외곽 `{rounded.xl}` + 1px `{colors.hairline}`, 내부 셀 구분선은 "컨테이너 배경+gap 1px" 트릭.
  대형 챕터 번호(`{typography.display-xl}`·aria-hidden) + 연도(`{typography.datetime}` primary) + 제목 +
  사진(`HistoryMedia`) + 본문 셀, 챕터마다 좌우 미러(지그재그, DOM 순서 유지). 마지막 챕터는
  `{colors.surface-dark}` 다크 밴드(내부 구분선은 on-dark·surface-dark `color-mix` 혼합). 도트 픽셀 장식·기타 스크롤
  연출은 채택하지 않음(단일 액센트·절제). 등장은 `Reveal` 재사용 + 사진 셀만 등장 신호(`data-revealed`)와
  동기된 방향성 `clip-path` 와이프(우측 사진 좌→우·미러 우→좌·모바일 일괄 좌→우, reduced-motion 정적). 모바일은 세로 스택.
- **`ministry-cards`**: 사역 카드 3-up(모바일 1-up). lucide 아이콘(32·currentColor) + 제목 +
  설명, 배경 토큰 교차는 history-band와 시작점을 달리한다. 동일한 Reveal 등장.
- **`dept-hero`**: 부서 상세 히어로(가이드 14B). 미디어 카드가 스크롤에 따라 `clip-path`로 풀스크린
  확장(width/height 애니메이션 금지), placeholder 측정으로 시작 inset 산출. 확장 종료(0.55) 후
  카피 페이드인(0.60~, 겹침 0.05 유지). reduced-motion은 정적 70vh. 검증 코드라 내부 수치(px·rgba·#fff)는
  토큰 인라인 금지의 예외. `HeroMedia`는 CrossHero와 공유(`@/hero/types`).
- **`department-card`**: 사역 부서 카드(목록·하위부서 공용). 16:9 부서 히어로 이미지 썸네일 + 이름
  `{typography.title-md}` + 인도자 `{typography.datetime}` `{colors.muted}`. `sermon-card` 호버(soft drop +
  썸네일 1.03 줌) 재사용. `/departments/{slug}`로 링크, 목록 카드 이미지 = 상세 히어로 이미지(목록↔상세 시각 연속성).
- **`church-photos`**: 교회사진(`/about/photos`) 공개 페이지. 카테고리 토글(`Tabs` 재사용, 교회 내부/외부)로 사진 그리드를 통째 교체, 썸네일 클릭 시 `Dialog` 확대 모달(좌우 이동·키보드, 이동은 활성 그룹 내부). 콘텐츠는 `CHURCH_PHOTOS` 상수(`public/photos/**` 정적 에셋) 주입, 갤러리 미재사용(자체 컴포넌트)·`<img>` 프레젠테이션 셸. 정적 생성(API 호출 0).
- **`dept-tree`**: 사역(부서) 목록 = 최상위 부서 카드 그리드(조직도 다이어그램 아님 — 탐색 목적·고령 터치·단일 액센트).
  공개 인트로는 **프론트 상수(`DEPARTMENTS`) 구동**(메인처럼 자립, 백엔드 불필요·정적 생성). 하위부서는
  인덱스에 펼치지 않고 각 상세의 `SubDepartments`에서만 노출. (백엔드 `department`는 교인 정보관리·어드민 별개.)
- **`auth-split`**: 인증(로그인·가입·재동의) 전용 풀스크린 스플릿. 좌측 50% 사진 패널
  (`{colors.cover-dark}` 반투명 덮개 + on-dark 로고·슬로건, 콘텐츠는 church.ts 상수 주입) /
  우측 `{colors.surface-soft}` 폼 패널에 카드 중앙 배치. 모바일(<768px)은 사진 숨김·우측 단독.
  좌측 패널은 풀블리드 미디어 예외(라운드 없음). 헤더·푸터 미사용 — 좌상단 로고가 홈 링크.
- **`wizard-progress`**: 가입 위저드 단계 도트. 진행 단계까지 `{colors.primary}` 채움, 미진행
  `{colors.hairline}`, `{rounded.full}`. 장식 요소라 `aria-hidden` + sr-only 단계 텍스트 병행.

### 폼
- **`text-input`**: 12px 라운드, 포커스 시 보더 2px `{colors.primary}`.
- **`password-input`**: 비밀번호 입력 변형. `text-input`을 그대로 감싸고 우측에 표시/숨기기 토글
  (lucide `Eye`/`EyeOff`, 20px·`currentColor`, `{colors.muted}`→`{colors.ink}` hover)을 오버레이한다.
  토글로 `type=password ↔ text` 전환, 버튼은 `aria-label`·`aria-pressed` 제공. 토큰·라운드는 상속.
- **`checkbox`**: 약관 동의 등 불리언 입력. 박스 24px · `{rounded.xs}`(4px) — 24px 박스에서
  `{rounded.sm}`(8px)은 곡률이 과해 4px이 중첩 라디우스 비율(외부 ≈ 내부 ×2)에 부합한다.
  체크 시 `{colors.primary}` 채움 + on-primary lucide `Check`. 라벨 포함 행 전체가 클릭
  영역(행 높이 ≥ 48px — 고령 터치). 에러 메시지는 text-input과 동일(아래 caption, semantic 토큰).
- 검증 메시지는 입력 아래 `{typography.caption}`, 색은 semantic 토큰.

### 마이페이지
- **`manage-hub`**: 마이페이지 관리 허브 섹션. `useMe().permissions` 기준 권한 보유 도메인만 카드로 노출(보유 0이면 섹션 비노출). 카드 = `{rounded.xl}`(24px) + 1px 헤어라인, hover 시 보더 `{colors.primary}` 전이. 공개 도메인 카드는 해당 공개 페이지로, 운영 도메인은 `/mypage/manage/*`로 링크. 어드민 화면이라 가독성 우선 단순 변형이되 토큰 공유(hex·px 인라인 금지). **카드는 테마 카테고리(콘텐츠·미디어/업로드·조직·회원/권한, `MANAGE_CATEGORIES` 순서)로 묶어 섹션 분리**: 카테고리 제목 `{typography.title-sm}`(600) ↔ 카드 라벨 `{typography.body-md}`(400)의 **굵기 대비** + 카테고리 경계 1px 헤어라인 divider(첫 그룹 제외 `border-t` + 상하 여백)로 '정보가 바뀌는 지점'을 드러낸다(그림자 단계 추가 없이 헤어라인+무게 위계만). 보유 카드 0개인 카테고리는 제목째 비노출. 관리 제목 아래에는 2px `{colors.ink}` 앵커 구분선(`border-t-2`, 카테고리 사이 1px 헤어라인보다 두껍게)을 두어 제목↔카테고리 위계를 강조한다.

### 성경통독 챌린지

- **`challenge-today-band`**: 챌린지 상세의 "오늘의 통독" 다크 밴드(C-2 몰입형). `{colors.surface-dark}` 배경 +
  on-dark 텍스트, 모바일 좌우 풀블리드. 초대형 타이포 `{typography.display-xl}`(모바일 clamp 축소), 구절 강조는
  `{colors.primary-on-dark}`(#0052ff의 다크 위 대비 보정 — 이 밴드 전용). CTA "다 읽었어요"는 풀폭(모바일)
  56px primary 필. 기록 완료 상태는 밴드 내 반투명 카드 + `{rounded.full}` 체크 플레이트. 문구는 일상어만
  (스트릭→"N일 연속으로 읽고 있어요", 페이스→"목표보다 N일 빨라요"). UPCOMING=D-day, ENDED=완주 응원 문구.
- **`reading-calendar`**: 벽걸이 달력식 월 그리드(히트맵 아님, EventCalendar의 monthMatrix 재사용). 읽은 날
  `{colors.primary-soft}` 채움 + ✓ + 장 수, 오늘 `{colors.primary}` 2px 테두리, 셀 `{rounded.sm}`. 셀 탭 =
  기록/취소 다이얼로그 입구(시작일~오늘 범위만 활성). 월 이동은 챌린지 시작월~현재월.
- **`challenge-feature-card`**: 목록 상단 피처 카드. 참여 중 ONGOING = 다크 미니 밴드(오늘 읽을 곳·진행 요약 +
  "오늘 기록하러 가기") / 미참여 ONGOING = 참여 CTA. `{rounded.xl}`, 카드 그리드보다 큰 단일 카드.

### 어드민 공용 (Admin Shared)

> 어드민 트랙(02~07)이 등록하는 공용 컴포넌트 구획. 병렬 작업 머지 충돌 최소화를 위해 각 도메인은
> **자기 구획 주석 아래에만** 항목을 추가한다(다른 구획 라인은 건드리지 않는다). 어드민 화면은 본 문서
> 범위 밖(Known Gaps)이라 가독성 우선 단순 변형이되, 토큰은 공유한다(hex·px 인라인 금지, `typo.*` 사용).
> **단일 생산자**: `markdown-editor`·`tag-multiselect`·인라인 액션 패턴=02, `admin-data-table`·`media-uploader`=05가
> 최초 등록·구현하고 나머지 도메인은 재사용만 한다. (조율 기준: `docs/superpowers/specs/2026-06-14-admin-track-parallelization.md`)

<!-- admin:02 콘텐츠(설교·공지) — markdown-editor · tag-multiselect · admin-inline-action -->
- **`markdown-editor`**: 어드민 본문 작성/미리보기 탭 에디터. `Tabs`(작성·미리보기) + `Textarea` + `MarkdownContent`(미리보기 재사용). 미리보기는 탭 활성 시에만 변환. 토큰 공유(가독성 우선 단순 변형).
- **`tag-multiselect`**: 기존 태그 다중선택. `Popover` + `Checkbox` 목록 + 선택 `Badge` 칩. 옵션은 `getTags`. 신규 생성 없음(06 소관).
- **`admin-inline-action`**: 공개 RSC 페이지 위 client island(목록 toolbar 등록 버튼·상세 수정/삭제·공지 고정 토글). `RequirePermission` 게이트, 카드 내부 중첩 `<a>` 금지(목록 액션은 카드 밖).
<!-- admin:03 일정 — datetime-picker · event-form-modal -->
- **`datetime-picker`**: 일정 시작·종료 입력. 네이티브 `<input type="datetime-local">`(종일이면 `date`) 래퍼, 라이브러리 없이. `Input` 토큰·error 배선 상속. 직렬화는 `toServerDateTime`(offset 없는 LocalDateTime).
- **`event-form-modal`**: 일정 등록·수정 팝업 Dialog 폼. DateTimePicker·MarkdownEditor·TagMultiSelect·Checkbox(종일) 조합. 종료>시작 검증, 낙관락 version.
<!-- admin:04 부서 — admin-department-tree -->
<!-- admin:05 미디어 — admin-data-table · media-uploader · media-picker · media-references-list · bulletin-form-modal · album-form-modal · gallery-photo-manager (크로스도메인 공유는 admin-data-table·media-uploader만, 나머지는 05 전용) -->
- **`admin-data-table`**: 어드민 목록 공용 테이블(단일 생산, 06·07 소비). `Column<T>`(key·header·cell·className) + rows + rowKey + actions(후행 셀) + empty/loading. 정렬·선택·페이지네이션 미내장(페이지는 `common/Pagination` 조합). 헤어라인 행 구분, `typo.*`.
- **`media-uploader`**: 미디어 업로드 위젯(단일 생산). 네이티브 파일 선택 + 클라 사전검증(accept별 MIME·10MB) + `POST /api/admin/media`. `accept`(image|pdf|all, all=라이브러리 전용), `multiple`. 가독성 우선 단순 변형.
- **`media-picker`**: 미디어 선택 허브(Dialog+Tabs). "라이브러리"(기존 그리드·type 필터·선택) / "새 업로드"(media-uploader). `onConfirm(mediaIds)`. 갤러리(image·multi)·주보(pdf·single) 공용.
- **`media-references-list`**: 차단형 삭제 안내 Dialog. 참조 type/title 목록 표시, 삭제 버튼 없음(편집 유도).
- **`bulletin-form-modal`**: 주보 등록·수정 Dialog. Input(제목)·DateTimePicker(예배일)·MediaPicker(pdf·single). 낙관락 version(query), 수정은 getBulletin(no-store) 시드.
- **`album-form-modal`**: 갤러리 앨범 등록·수정 Dialog. Input(제목)·MarkdownEditor(설명)·TagMultiSelect. 낙관락 version(body).
- **`gallery-photo-manager`**: 앨범 상세 사진 관리. "사진 추가"(MediaPicker image·multi → addPhotos) + 사진별 제거(라이트박스 버튼 밖 오버레이 → removePhoto).
<!-- admin:04 부서 -->
- **`department-admin-manager`**: 어드민 부서 계층 관리 화면(트랙 04). 공개 `GET /api/departments`(no-store)를 `buildDepartmentTree`로 조립해 **접이식 단일 트리**(`department-tree`)로 표시. 페이지 Container 폭 그대로 사용(공지·미디어와 동일, 별도 폭 캡 없음) + 전체 펼치기/접기 + 안내 배너(lucide `Info`). 접힘 상태 `Set`(effect 미사용). 공개 격리라 ISR revalidate 미사용·어드민 쿼리 캐시만 무효화.
- **`department-tree`**: 접이식 부서 트리(트랙 04). `flattenVisible`로 가시 행만 렌더 — 자식 있는 노드만 chevron(▸/▾, `aria-expanded`), 잎 노드는 동일 폭 스페이서(`w-6`)로 정렬, depth 들여쓰기 토큰. 행은 R1(이름·담당 `flex-1 truncate` 좌, 액션 `shrink-0 whitespace-nowrap` 우). 노드별 `＋하위·수정·삭제`(아이콘+`lg:` 텍스트).
- **`department-form-modal`**: 부서 생성·수정 Dialog(트랙 04). 이름·담당(`Input`)·상위 부서(native `select`, edit 시 자기+하위 제외로 순환 방지)·정렬 순서(number)·설명(`markdown-editor`). 생성=POST, 수정=상세 시드 후 **항상 PUT**(루트화=상위 `(없음)`)·낙관락 version.
<!-- admin:06 분류(태그·직분) — tag/position form-dialog (admin-data-table 소비) -->
- **`tag-manager`**: 태그 목록·CRUD 화면(트랙 06). `DataTable`(이름) + 툴바 `새 태그` + 행 `수정`·`삭제`(`DeleteConfirmDialog`, 비차단 삭제 경고문). 목록은 공개 `getTags`(`["tags"]` 키 공유) 재사용, mutation onSuccess에서 `["tags"]` invalidate + `revalidateTags()`로 공개 ISR 무효화.
- **`tag-form-modal`**: 태그 생성·수정 Dialog(트랙 06). `Input`(이름) 단일 필드. version 없음 — 행 값 시드(상세 GET 불요). 중복 시 name 인라인 에러(`onDuplicate`).
- **`position-manager`**: 직분 목록·CRUD 화면(트랙 06). `DataTable`(이름·정렬순서) + 상단 "권한 무관 표시용" 안내 배너(lucide `Info`). 공개 소비자 없음 — `["positions"]` 클라 쿼리만 무효화.
- **`position-form-modal`**: 직분 생성·수정 Dialog(트랙 06). `Input`(이름) + number `Input`(정렬 순서, `Controller`로 null↔"" 매핑). 생성 시 정렬순서 생략→백엔드 자동부여, 수정 시 비움→미변경(body 생략).
- **`role-manager`**: 역할 목록·CRUD 화면(트랙 07A). `DataTable`(역할명·우선순위·권한수·시스템) + 행 `수정`·`권한`·`삭제`. 위계 가드(`canManageRole`=`!isSystem && priority ≤ 내 maxPriority`)로 시스템·상위 역할 행은 액션 비활성. 상단 안내 배너(lucide `Info`). 공개 소비자 없음 — `["admin","roles","list"]` 클라 쿼리만 무효화.
- **`role-form-modal`**: 역할 생성·수정 Dialog(트랙 07A). `Input`(이름)+number(우선순위, `≤ maxPriority` zod 검증·헬퍼 텍스트)+`Input`(설명). 중복 시 name 인라인 에러. 수정 onSuccess는 `["roles"]`·`["me"]` 동시 무효화(자기 보유 역할 변경 대비).
- **`role-permissions-modal`**: 역할별 권한 매트릭스 Dialog(트랙 07A). `getPermissions` 카탈로그 기반 `Checkbox` 2열, 역할 보유 권한으로 시드(keyed 마운트 초기화), 저장 시 선택 권한 **이름 배열**로 전체 교체 PUT. onSuccess `["roles"]`·`["me"]` 무효화.
- **`member-manager`**: 회원 목록·검색·CRUD 오케스트레이터(트랙 07B). `DataTable`(이름·전화·직분·역할·승인·가입일) + URL 구동 검색·`Pagination`(MediaLibrary 동형) + 상세 다이얼로그 + 전역 약관 패널. 페이지 게이트 `MEMBER_MANAGE`. 공개 소비자 없음 — 클라 쿼리만 무효화.
- **`agreement-reset-panel`**: 전역 약관/개인정보 재동의 리셋(트랙 07B). 안내 배너(lucide `Info`) + `DeleteConfirmDialog`(button-destructive) 강한 확인창. 전체 회원 영향이라 회원 카드 무효화 없음(notify만).
- **`member-detail-dialog`**: 회원 상세 Dialog(트랙 07B). 승인 Badge·직분·역할 chips·권한 수·동의상태(약관/개인정보 Badge + agreedAt) + 인라인 편집·역할·비번 섹션 조합. `getMember`(no-store 성격, retry false) 시드.
- **`member-profile-form`**: 상세 다이얼로그 내 인라인 편집(이름·전화·이메일, 트랙 07B). `formatPhone` 입력 정규화, 전화 중복 시 phone 인라인 에러. 자기 수정 시 `["me"]` 무효화.
- **`member-roles-section`**: 보유 역할 chips·회수(×) + 부여(native select, `getRoles` 재사용 필터, 트랙 07B). `canAssignRole`(strict)·자기 가드, `useHasPermission("ROLE_MANAGE")`로 상호작용/읽기전용 전환.
- **`reset-password-section`**: 인라인 확인 → 임시 비밀번호 1회 표시(복사, 트랙 07B). 캐시 미저장, 다이얼로그 닫힘 시 언마운트로 휘발.
<!-- admin:07 거버넌스 — role-permission-matrix · reset-password-reveal · agreement-reset-dialog -->

## Do / Don't

### Do
- `{colors.primary}`는 밴드당 한두 번만 등장시킨다.
- CTA는 16px, 카드는 24px 라운드 — 중첩 시 외부 ≈ 내부 × 2.
- 디스플레이 굵기 500 유지.
- 흰 섹션 ↔ 회색 밴드 ↔ 다크/미디어 밴드의 교차로 페이지 리듬을 만든다.
- 날짜·시간엔 항상 `{typography.datetime}` (tnum).
- 본문 행간 1.7 유지.

### Don't
- 두 번째 브랜드 컬러를 도입하지 않는다 — **단, 외부 지도 서비스 공식 버튼(`button-kakao`·`button-naver`)은 예외**(제3자 브랜드색, 해당 버튼에만).
- 디스플레이를 700+로 볼드하지 않는다.
- 그림자 단계를 추가하지 않는다.
- CTA에 직각 모서리를 쓰지 않는다.
- semantic success/error를 버튼·배경 색으로 쓰지 않는다 — **단, 파괴적 확인 버튼(`button-destructive`)은 예외**.
- hex·px를 인라인으로 쓰지 않는다 — 항상 토큰 참조.

## 반응형 (Responsive)

| 구간 | 폭 | 변화 |
|---|---|---|
| Mobile | < 640px | 히어로 h1 72→36px, 카드 1-up, 네비 햄버거, 섹션 패딩 64px |
| Tablet | 640–1024px | 히어로 h1 56px, 카드 2-up |
| Desktop | 1024–1280px | 히어로 h1 72px, 카드 3-up |
| Wide | > 1280px | 콘텐츠 1200px 캡, 히어로 미디어만 풀블리드 |

- 터치 타깃: 기본 CTA 48px, 히어로 CTA 56px (WCAG AAA 이상 — 고령 사용자 여유 확보).
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
