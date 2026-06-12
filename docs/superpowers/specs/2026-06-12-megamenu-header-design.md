# 메가메뉴 헤더 개편 설계 스펙

> 2026-06-12 확정. 참조: 우리은행 GNB(Playwright 직접 관찰 — 1뎁스 호버 시 전 카테고리가 컬럼으로
> 펼쳐지는 풀폭 패널) + 사용자 제공 목업(아이콘 플레이트 + 라벨 행 구성).

## 1. 확정 결정

| # | 결정 | 내용 · 근거 |
|---|---|---|
| M1 | **IA 4컬럼 재편** | 교회안내(/about: 소개·연혁·비전·오시는길) / 예배·설교(/worship: 예배시간·설교) / 교육부서(/departments: 안내 1링크 — 부서별 라우트는 T9/T13 후 추가) / 소식(/notices: 공지·일정·주보·갤러리). 라우트 없는 목업 항목(목회자 인사말 등)은 제외 — 라우트 발명 금지. `navigation.ts`가 단일 출처라 푸터·모바일도 함께 재편 |
| M2 | **메가메뉴 = 전체 패널** (우리은행 방식) | 1뎁스 어디든 호버/포커스 → 헤더 아래 풀폭 흰 패널에 4컬럼 전체 표시. 닫힘: 헤더 mouseleave·Esc·링크 클릭. 등장 0.2s fade+slide(reduced-motion 즉시). 모바일(<768)은 기존 햄버거 시트 유지 |
| M3 | **아이콘 플레이트 단일 틴트** | 목업의 4색(파/초/보/주황)은 단일 액센트 원칙 위반 → `rounded-full`(40px) `bg-primary-soft` + lucide 아이콘 `text-primary`(20px)로 재해석. 아이콘 키는 상수에 문자열로(직렬화), 컴포넌트에서 lucide 매핑 |
| M4 | **인증 영역 단일 링크** | `useAuthStore` member 스냅샷: 있으면 마이페이지, 없으면 로그인 — 하나만 표시(헤더·모바일 시트 공통). NAV_AUTH 배열 제거 → NAV_LOGIN·NAV_MYPAGE |
| M5 | **투명 헤더 충돌 방지** | 메인(투명 on-dark)에서 패널이 열리면 헤더를 라이트 스킨으로 강제(`solid ∨ megaOpen`) — 흰 패널 위 흰 글씨 방지 |
| M6 | 텍스트·간격 추가 확대 | nav-link 19→**21px**(토큰·DESIGN 표 동기), 1뎁스 간격 gap-lg(24)→**gap-xl(32)** — 메뉴 5→4개로 줄어 여유. 로고는 titleMd(22px) 유지(토큰 위계 준수). 헤더 높이 80px 유지 |

## 2. 파일 구조

```
신규
└─ src/components/shell/MegaMenu.tsx (+test)   # 풀폭 패널 — open/onNavigate를 SiteHeader가 제어

변경
├─ src/constants/navigation.ts (+test)   # NavIconKey·icon 필드, NAV_PRIMARY 4항목(전부 href+children),
│                                        #   NAV_LOGIN·NAV_MYPAGE, FOOTER_COLUMNS 재편
├─ src/lib/nav.ts (+test)                # isActiveItem: href 활성 ∨ children 활성 (기존: href만 단락)
├─ src/components/shell/SiteHeader.tsx (+test)  # 메가메뉴 통합·인증 단일·gap-xl·DropdownMenu 제거
├─ src/components/shell/MobileNav.tsx (+test)   # 전 항목 그룹 렌더(라벨=href 링크)·인증 단일
├─ src/components/shell/SiteFooter.test.tsx     # 컬럼명 변경 반영(교회소개→교회안내 등)
├─ src/app/globals.css                   # --text-nav-link 21px
└─ .claude/rules/DESIGN.md               # nav-link 21 표·mega-menu 컴포넌트 항목(규칙 4)
```

## 3. 동작 명세

- **열림**: 데스크톱 nav 영역 `mouseEnter` 또는 1뎁스 링크 `focus` → `megaOpen=true`.
  1뎁스 링크에 `aria-expanded`. 패널 닫힘 상태: `opacity-0 -translate-y-2 pointer-events-none`
  + `aria-hidden` + 내부 링크 `tabIndex=-1`(포커스 트랩 방지)
- **닫힘**: `<header>` `mouseLeave` / `Escape` keydown / 패널 내 링크 클릭(`onNavigate`)
- **패널**: `absolute inset-x-0 top-full`(헤더가 anchor — light variant에 `relative` 추가),
  `bg-canvas` + `border-b hairline`, Container 안 `grid-cols-4 gap-xl py-xl`.
  컬럼 = 1뎁스 링크(titleSm, 하단 헤어라인) + 행(아이콘 플레이트 + 라벨 navLink, hover 시 primary)
- **1뎁스 활성 표시**: `isActiveItem` — href 하위 경로 또는 children 중 활성(예: /events에서 "소식" 활성)
- transition은 `transition-[opacity,translate]`(Tailwind v4 translate 속성 — 메모리 규칙 준수),
  `motion-reduce:transition-none`

## 4. 테스트

| 대상 | 검증 |
|---|---|
| navigation | 4항목·전부 href+children·아이콘 키 존재·NAV_LOGIN/NAV_MYPAGE |
| nav.isActiveItem | href 활성 / children 활성(/events→소식) / 비활성 |
| MegaMenu | 닫힘: aria-hidden·tabIndex -1 / 열림: 4컬럼·아이콘 플레이트 렌더·링크 클릭 시 onNavigate |
| SiteHeader | nav mouseEnter→패널 열림(aria-expanded), Escape→닫힘, member null→로그인만, member 존재→마이페이지만, 투명+megaOpen→라이트 스킨, 기존 solid 테스트 회귀 |
| MobileNav | 그룹 렌더(1뎁스 라벨 링크+children), 인증 단일 링크 |
| SiteFooter | 새 컬럼명·링크 |

## 5. 범위 밖
부서별 메뉴 항목(T9/T13 라우트 후) / 로그인·마이페이지 실제 페이지(T14·T15) / 모바일 시트의 메가메뉴화.
