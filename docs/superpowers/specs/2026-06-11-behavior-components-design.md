# T04 공통 동작 컴포넌트(shadcn 재스킨) — 설계

**작성일:** 2026-06-11
**이슈:** `.issues/T04-behavior-components.md`
**선행:** T2(셋업) · T3(시각 컴포넌트, 완료 — `.report/20260610_#4_공통_시각_컴포넌트.md`)
**참조:** 가이드 15.1 · 15.2 · 15.4 / DESIGN.md / AGENTS.md

---

## 1. 목적

동작 중심 컴포넌트만 shadcn/ui로 도입하고 DESIGN.md 토큰으로 재스킨한다.
코드 복사 방식이라 파일은 프로젝트 소유 — 기본 룩을 즉시 재스킨하되 **접근성 동작은 깨뜨리지 않는다.**

도입 목록(15.1 — 정확히 이것만): `Dialog(Modal)` · `Toast(sonner)` · `Popover` · `DropdownMenu` · `Select` · `Tabs` · `Sheet`(모바일 네비).

---

## 2. 핵심 결정

### 2.1 재스킨 전략 — 토큰 직결 (확정)

shadcn 컴포넌트 소스만 가져온 뒤 className을 **우리 토큰 유틸로 재작성**한다.
shadcn `init`이 깔려는 시맨틱 변수 레이어(`--background`·`--foreground`·`--radius` 등)는 **도입하지 않는다.**

- **이유 1 (단일 토큰 어휘):** 프로젝트 규칙 "토큰 참조 강제 / 값 중복 정의 금지". 두 번째 변수 네임스페이스를 만들지 않는다. T03 시각 컴포넌트와 동일 idiom 유지.
- **이유 2 (다단계 라디우스):** 우리 디자인은 역할별 라디우스(배지 8 / 입력 12 / 버튼 16 / 카드 24)가 핵심인데, shadcn의 `--radius`는 단일 스칼라 + `calc()` 오프셋이라 이 위계를 표현하지 못한다.
- **이유 3 (zinc 누수 차단):** 기본 zinc 팔레트가 변수 레이어 어딘가에 남을 위험을 원천 제거한다(15.4 검수 기준).

### 2.2 애니메이션 — 자체 키프레임 (확정)

Radix가 붙이는 `data-[state=open|closed]`에 매핑되는 키프레임을 `globals.css`에 직접 정의한다.
`tw-animate-css`(shadcn v4 공식 동반 패키지)는 **도입하지 않는다.**

- **이유:** 15.1 확정 스택 밖 라이브러리 추가 금지. 필요한 키프레임은 5~6개(다크모드·복잡 효과 제외)라 자체 정의 비용이 낮고, DESIGN의 0.2~0.3s ease 규약과 직접 맞물린다.

---

## 3. 아키텍처

### 3.1 도입 경로 — 수동 벤더링 우선

레지스트리 소스를 **수동 복사(vendoring)** 하는 것을 1차 경로로 한다.

- **이유:** shadcn `init`은 이 환경(Tailwind v4 + new-york)에서 `globals.css`에 시맨틱 변수·base 레이어를 자동 주입하고 `tw-animate-css`를 설치한다 — 우리 금지 조건(시맨틱 변수 레이어 미도입 · globals 자동 수정 금지 · 애니메이션 라이브러리 추가 금지)과 정면 충돌한다. 토큰 직결 재스킨(2.1)은 shadcn 생성 클래스를 어차피 버리므로, CLI의 이점(올바른 Radix 조합 + a11y 배선)은 레지스트리 소스 복사로 동일하게 얻는다.
- **절차:** ui.shadcn.com 레지스트리에서 각 컴포넌트 소스 복사 → `src/components/ui/`에 lowercase 배치 → **즉시 토큰 직결 재스킨**(2.1) + 애니메이션은 자체 키프레임(2.2)으로 교체.
- **`components.json`:** 수동 벤더링에서는 불필요하다(`@/lib/utils`·`@/components/ui` 경로는 이미 우리 구조와 일치). CLI를 참조용으로만 쓸 경우에 한해 **전체 값을 명시**한다 — `style:"new-york"`, `rsc:true`, `tsx:true`, `tailwind.config:""`, `tailwind.css:"src/app/globals.css"`, `tailwind.cssVariables:false`, `iconLibrary:"lucide"`, `aliases` 전체. 이 경우에도 CLI가 건드린 `globals.css`/`package.json` 변경은 되돌리고 재스킨한다.

### 3.2 파일 조직

- 도입 컴포넌트는 `src/components/ui/`에 shadcn 관례대로 **lowercase**:
  `dialog.tsx` · `sheet.tsx` · `popover.tsx` · `select.tsx` · `dropdown-menu.tsx` · `tabs.tsx` · `sonner.tsx`.
- T03 시각 원자(`Button.tsx`·`Card.tsx`·`Badge.tsx`·`Input.tsx`)는 PascalCase 유지 — 출처별 관례를 분리한다(macOS 대소문자 비충돌).
- Toast seam: `src/lib/notify.ts`.

### 3.3 의존성 (15.1 표 1줄 갱신 동반)

| 패키지 | 용도 |
|---|---|
| `@radix-ui/react-dialog` | Dialog(Modal) + **Sheet 공용** 엔진 |
| `@radix-ui/react-popover` | Popover |
| `@radix-ui/react-dropdown-menu` | DropdownMenu |
| `@radix-ui/react-select` | Select |
| `@radix-ui/react-tabs` | Tabs |
| `sonner` | Toast |
| `lucide-react` | Select 체크/화살표, Dialog 닫기 X (확정 스택, 이번에 첫 도입) |

- 이들은 가이드가 명시한 "shadcn/Radix 기반" 동작 엔진으로, 15.1 "UI 컴포넌트=하이브리드" 결정의 전제다. 15.1 표에 1줄 명기한다.
- 애니메이션 라이브러리(`tw-animate-css` 등)는 추가하지 않는다.

---

## 4. 재스킨 공통 규칙

전 컴포넌트에 동일 적용한다.

| 항목 | 토큰 |
|---|---|
| 팝업 표면 | `bg-surface-card` (다크 위 필요 시 `bg-surface-dark-elevated`) |
| 백드롭 | 검은 알파(예: `bg-surface-dark/40`) |
| 텍스트 | `text-ink` / `text-body` / `text-muted`, 위계는 `typo.*` 상수 |
| 보더 | `border-hairline` |
| 라운드 | 카드형 콘텐츠 `rounded-xl`(24) → 내부 아이템 `rounded-md`(12)/`rounded-sm`(8) (중첩 라디우스) |
| 패딩 | 카드 내부 `p-xl`(32) 또는 상황별 축소(`p-sm`/`p-base`) |
| 포커스 | `focus-visible:ring-2 ring-primary ring-offset-2 ring-offset-canvas` (T03 idiom) |
| 레이어 | portal/overlay는 §4.1 z-index 정책을 따른다(고정 네비 위에 뜬다) |

**금지:** hex·px 인라인, arbitrary value, zinc 팔레트, shadcn `--background`/기본 `--radius` 잔재.

### 4.1 레이어링(z-index) 정책

현재 토큰에 z-index가 없고 `top-nav-transparent`는 `position: fixed; z-index: 10`(DESIGN.md)이다. portal로 렌더되는 동작 컴포넌트가 이 고정 네비 **아래에 깔리지 않도록** z 스케일을 DESIGN.md → globals.css에 토큰으로 추가하고 전 portal에 적용한다.

| 레이어 | z | 대상 |
|---|---|---|
| nav | 10 | `top-nav-transparent` (기존, 문서화) |
| popover | 40 | Popover · DropdownMenu · Select · Tabs content |
| overlay | 50 | Dialog · Sheet 의 overlay + content |
| toast | 60 | sonner `<Toaster />` (항상 최상위) |

- DESIGN.md에 "레이어링(z-index)" 항목을 추가한 뒤 globals.css에 `--z-*` 토큰으로 노출하고 유틸로 참조한다(값 중복 정의 금지).

---

## 5. 컴포넌트별 명세

### 5.1 Dialog (Modal)
- 백드롭 + 센터 카드(`rounded-xl`·`p-xl`), 닫기 버튼 lucide `X`.
- `DialogTitle` 유지 — 시각적으로 숨길 때도 `sr-only`로 남긴다(aria 연결 보존).
- `DialogDescription`은 기본 제공한다. 설명이 없는 모달은 `aria-describedby={undefined}`를 명시해 Radix의 누락 경고를 막는다.
- **보존(Radix):** 포커스 트랩, 닫힘 시 트리거 포커스 복귀, ESC·오버레이 닫기, `role="dialog"`+`aria-modal`+`aria-labelledby`, body 스크롤 잠금.

### 5.2 Sheet
- `react-dialog` 기반 슬라이드 패널(모바일 네비 T07용). `side` 지원, 슬라이드 키프레임 적용.
- Dialog와 동일 a11y 보존.

### 5.3 Toast (sonner)
- 루트 `layout`에 전역 `<Toaster />` **1개**. 자동소멸 **4초**, success/error 변형, 토큰 재스킨.
- **보존:** sonner의 visually-hidden `aria-live` live-region(스크린리더 낭독 경로).
- **얇은 seam `src/lib/notify.ts`:** `notify.success(msg)` / `notify.error(msg)` — duration 4000 고정 + 토큰 스타일 주입. T06 errorCode→UI 매핑(4.2)은 이 seam만 호출한다(출력 채널 단일화).
- **호출 경계:** `notify.*`는 client 컴포넌트·이벤트 핸들러 전용(`"use client"` 모듈). 서버 컴포넌트·서버 액션에서 import/호출하지 않는다.
- **검증 분리:** live-region 존재 + 토스트 텍스트 삽입 + 4초 후 제거는 자동(§7.2), 실제 낭독은 VoiceOver 수동 스모크(§7.3).

### 5.4 Popover / DropdownMenu / Select / Tabs
- 동일 토큰 재스킨(§4). 콘텐츠 카드 `rounded-xl`.
- **보존(Radix):** 트리거 `aria-expanded`, ESC·외부 클릭 닫기, 포커스 복귀, 키보드 내비게이션.
- Select 화살표/체크는 lucide(`ChevronDown`·`Check`), `currentColor`·`size`.

---

## 6. 애니메이션

`globals.css`에 키프레임 + `data-state` 매핑을 직접 정의한다.

- 키프레임: `overlay-in/out`, `content-in/out`(fade+zoom), `slide-in/out-{right,left,top,bottom}`(Sheet — `data-state=closed` 닫힘 방향까지). 방향별은 translate 부호만 바꾸는 공통 키프레임으로 묶는다.
- 타이밍: 0.2~0.3s ease (DESIGN 기본값).
- `prefers-reduced-motion: reduce` 시 애니메이션 제거.
- 다크모드 variant는 작성하지 않는다(Known Gaps).

---

## 7. 검증 (15.4 게이트)

정식 테스트 러너(`@playwright/test`)는 이 태스크에서 **도입하지 않는다**(CLAUDE.md — 러너는 별도 태스크, 15.1 미등재). T03과 동일하게 **MCP Playwright 브라우저로 인터랙티브 점검**한다.

### 7.1 데모 하베스트
- `/showcase`에 **"동작 컴포넌트" 섹션**을 추가한다(T03 패턴 연장). 각 컴포넌트의 트리거 + 데모를 배치.

### 7.2 자동(MCP 브라우저) 점검
- **Modal:** Tab 순환이 모달 밖으로 안 나감 / 닫힘 시 트리거로 포커스 복귀 / 열림 중 body 스크롤 잠금.
- **Toast(자동 가능 범위만):** live-region(`role`/`aria-live`) 존재 + 토스트 텍스트 삽입 + 4초 후 제거. **실제 SR 낭독은 단정하지 않는다.**
- **레이어:** Dialog/Popover/Select 등 portal이 고정 네비(z-10) **위에** 렌더된다(§4.1).
- **잔재 스캔:** 전 컴포넌트 computed style에 zinc·기본 radius 없음.
- **목록 점검:** `components/ui/`에 **15.1 목록 외 shadcn 도입 컴포넌트** 없음 — allowlist(`dialog`·`sheet`·`popover`·`select`·`dropdown-menu`·`tabs`·`sonner`)만 허용. T03 `Button/Card/Badge/Input`는 무관.

### 7.3 수동 스모크
- **VoiceOver:** 새 토스트가 실제로 낭독되는지 1회 확인(자동화 불가 영역).

### 7.4 정적 검증
- `pnpm exec tsc --noEmit` · `pnpm lint` · `pnpm build` 통과.

---

## 8. 스코프

### 포함
7종 도입 + 토큰 재스킨 + Toast 전역 컨테이너 + `notify` seam + `/showcase` 데모 + 애니메이션 키프레임 + z-index 레이어링 토큰(DESIGN.md → globals.css, §4.1).

### 제외 (각 태스크에서)
- `confirmReedit` 모달(8.3) · 미디어 삭제 차단 안내(6.3) → T6/T8 등 실제 사용처.
- 모바일 햄버거 네비(T7) · 캘린더 "+n" 팝오버(T12) 실제 사용처.
- 다크모드(Known Gaps).

---

## 9. 리스크 / 선행 작업

- **AGENTS.md:** 구현 첫 단계로 `node_modules/next/dist/docs/01-app/`의 클라이언트 컴포넌트·레이아웃 항목을 정독한다(이 Next는 일반 버전과 다름). 특히 루트 layout(서버 컴포넌트)에서 client `<Toaster />`를 렌더하는 경계.
- shadcn CLI `init`은 `globals.css` 자동 주입 + `tw-animate-css` 설치를 동반하므로 사용하지 않는다 → §3.1 수동 벤더링 우선.
- sonner 기본(다크) 스타일 잔재 → 재스킨 시 명시적 제거를 검증(7.2 잔재 스캔).

---

## 10. 완료 조건 (T04 + 15.4 매핑)

- [ ] 7개 컴포넌트 도입 + 토큰 재스킨 (zinc·기본 radius 잔재 0)
- [ ] portal 레이어가 고정 네비 위에 렌더(§4.1 z-index 정책 적용)
- [ ] Toast 전역 컨테이너(성공/오류, 4초 자동소멸) + `notify` seam(client 전용)
- [ ] Modal: 포커스 트랩 / 트리거 포커스 복귀 / 배경 스크롤 잠금 (재스킨 후에도)
- [ ] Toast: live-region 자동 검증(존재·삽입·4초 제거) + VoiceOver 수동 스모크 1회
- [ ] `components/ui/`에 **15.1 목록 외 shadcn 도입 컴포넌트** 없음(allowlist 기준)
- [ ] `/showcase` 데모 + MCP 브라우저 a11y 점검 + `pnpm exec tsc --noEmit`·`lint`·`build` 통과
