# T03 공통 시각 컴포넌트 설계 (Button · Card · Badge · Input)

**작성일:** 2026-06-10
**대상 이슈:** `.issues/T03-visual-components.md`
**선행:** T02(디자인 토큰·폰트) 완료
**참조:** DESIGN.md `components:`, 가이드 15.1·15.4

---

## 1. 목적 · 범위

DESIGN.md 정의대로 **시각 중심 컴포넌트를 직접 구현**한다(shadcn 버전 도입 금지). 모든 값은
T02 토큰(`globals.css @theme` → Tailwind 유틸)을 참조하며 hex·px 인라인은 0이어야 한다.

산출물: Button(5변형) · Card(베이스 + 합성 5종) · Badge(2변형) · Input(2변형) + `cn()` 유틸 +
검증용 쇼케이스 페이지.

**범위 밖:** 데이터 패칭(도메인 이슈 T08~T13에서 prop 주입), shadcn 동작 컴포넌트(T04),
원격 이미지 호스트 설정(remotePatterns, T10), 테스트 러너 도입(별도 셋업 이슈).

---

## 2. 결정 사항 (브레인스토밍 확정)

| 결정 | 선택 | 근거 |
|---|---|---|
| className 조합 | `clsx` + `tailwind-merge` 도입, `cn()` 헬퍼 | shadcn 표준 패턴. T04 shadcn이 동일 `cn` 요구 → T03·T04 공유. 충돌 해소로 override 안전 |
| `cn` 위치 | `src/lib/utils.ts` | shadcn 기본 경로 `@/lib/utils` 준수 → T04 컴포넌트 import 무수정 |
| Card 구조 | 베이스 `Card` 프리미티브 + 합성 5종 | 5종 레이아웃이 제각각 → variant 분기보다 합성이 단순. 라운드·헤어라인 토큰 1곳 집약 |
| 검증 방식 | `/showcase` 페이지 + `build`·`lint` + 수동 a11y | T03 검수 기준(픽셀 일치·focus-visible·키보드)에 직접 부합. 순수 프레젠테이션이라 유닛테스트 가치 낮음 |

---

## 3. 의존성 · 토큰 추가

### 3.1 라이브러리
- `clsx`, `tailwind-merge` 설치.
- 가이드 `docs/church-frontend-guide.md` 15.1 표에 신규 행 등재:
  `| 클래스 유틸 | clsx + tailwind-merge | cn()(lib/utils)로 variant className 병합·충돌 해소. shadcn(T4) 공유 |`

### 3.2 `cn()` — `src/lib/utils.ts`
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 3.3 그림자 토큰 — `globals.css @theme`
- `--shadow-soft: 0 4px 12px rgba(0,0,0,0.04);` 추가 → `shadow-soft` 유틸 생성.
- DESIGN.md Elevation의 **유일한 그림자 단계**를 인라인 대신 토큰화. rgba는 토큰 단일
  진실(globals.css) 안에서만 정의되므로 인라인 위반 아님.

### 3.4 치수 유틸 정책 (컴포넌트 높이·패딩)

색·라운드·의미 간격은 named 토큰(`bg-primary`·`rounded-xl`·`p-section`)을 쓴다. **컴포넌트
컨트롤 치수(버튼·입력 높이, 컨트롤 패딩)는 Tailwind v4 표준 숫자 스케일**을 쓴다 — 이는
`--spacing: 0.25rem`(기본 테마, globals.css 미변경 확인) 멀티플라이어로 생성되는 정규 유틸이며
**arbitrary 브래킷값이 아니다.** 금지 대상은 어디까지나 `bg-[#...]`·`p-[11px]` 같은 브래킷
arbitrary값이다(예외: `scale-[1.03]` — 색/px 토큰이 아닌 변환 비율).

DESIGN.md 표 수치 → 표준 유틸 매핑 (전부 정확히 떨어짐, 신규 토큰 0):

| 수치 | 유틸 | | 수치 | 유틸 |
|---|---|---|---|---|
| 44px(높이) | `h-11` | | 16px | `px-4` |
| 48px(높이) | `h-12` | | 20px | `px-5` |
| 56px(높이) | `h-14` | | 32px | `px-8` |
| 4px | `py-1` | | 12px | `px-3` |
| 14px | `py-3.5` | | | |

**높이는 `h-11`/`h-12`/`h-14`로 고정**하고 `inline-flex items-center justify-center`로 내용을
가운데 정렬한다 → 세로 패딩(11·14px)은 높이에 영향을 주지 않아 무의미해진다. `outlineOnDark`의
`11×19`는 패딩으로 44px·정렬을 맞추려던 보정값이므로 높이 고정 시 소멸 — 가로는 `px-5`(20px)로
통일하고, 1px 보더가 만드는 비가시 수준의 가로차는 의도적으로 허용(arbitrary px·신규 토큰 회피).

---

## 4. 파일 구조

```
src/
  lib/utils.ts                  # cn()
  components/
    ui/
      Button.tsx                # Button + buttonVariants() export
      Badge.tsx
      Input.tsx
      Card.tsx                  # 베이스 컨테이너
    cards/
      SermonCard.tsx
      NoticeRow.tsx
      ScheduleCard.tsx
      EventCard.tsx
      FeatureCard.tsx
  app/showcase/page.tsx         # 검증용(프로덕션 notFound)
```
원칙: 1파일 1컴포넌트(글로벌 coding-style: 많은 작은 파일).

---

## 5. 컴포넌트 명세

값은 모두 DESIGN.md `components:` / `.issues/T03` 표 기준. 아래는 **구조·동작**만 기술하고
크기·색은 토큰 유틸로 매핑한다.

### 5.1 Button — 서버/클라이언트 공용(shared, `"use client"` 없음)
- 네이티브 `ButtonHTMLAttributes<HTMLButtonElement>` 확장 + `variant`, `forwardRef`.
- **`"use client"`를 붙이지 않는다(shared 컴포넌트).** 훅·상태가 없어 서버·클라 양쪽에서 동작하고,
  무엇보다 `buttonVariants`(순수 함수)를 **서버 컴포넌트의 링크형 CTA에서 호출**하려면 client 모듈이면 안 된다
  — client 모듈의 export는 서버에서 호출 불가(런타임 에러: "call buttonVariants() from the server"). 검증으로 확인됨.
- **variant**(기본 `primary`):

  | variant | 배경 | 텍스트 | 라운드 | 패딩 | 높이 |
  |---|---|---|---|---|---|
  | `primary` | primary | on-primary | lg(16) | 12×20 | 44 |
  | `secondary` | surface-strong | ink | lg(16) | 12×20 | 44 |
  | `outlineOnDark` | transparent(보더 on-dark) | on-dark | lg(16) | 11×19 | 44 |
  | `tertiary` | transparent | primary | — | — | — |
  | `pillCta` | primary | on-primary | lg(16) | 16×32 | 56 |

  ※ 라운드는 중첩 라디우스 원칙(외부 ≈ 내부 ×2: 배지8↔버튼16, 입력12↔카드24, DESIGN Shapes 개정)을 따른다.

- **치수**(§3.4): 높이 `h-11`(pillCta는 `h-14`) + `inline-flex items-center justify-center`,
  가로 패딩 primary/secondary/outlineOnDark `px-5`·pillCta `px-8`. tertiary는 패딩 없음. 라운드 `rounded-lg`(16px).
- 프레스: primary/pillCta만 `active:bg-primary-active`.
- **disabled(variant별 분리)** + 공통 `disabled:cursor-not-allowed`:
  - `primary`/`pillCta`: `disabled:bg-primary-disabled disabled:text-on-primary`
  - `secondary`: `disabled:bg-surface-strong disabled:text-muted`
  - `outlineOnDark`/`tertiary`: 배경 투명 유지, `disabled:opacity-50`
- 타이포 `typo.button`. **한 밴드 primary 1개 원칙**(문서 가이드, 강제는 아님).
- **focus-visible 링**: 기본 `ring-2 ring-primary ring-offset-2 ring-offset-canvas`,
  `outlineOnDark`만 `ring-on-dark ring-offset-surface-dark`.
- **`buttonVariants(variant)` 함수 export**: className 문자열 반환 → 링크형 CTA를
  `<Link className={buttonVariants("pillCta")}>`로 처리(Radix Slot 의존 없이 a11y 보존).

### 5.2 Card 베이스 — 서버 컴포넌트
- `HTMLAttributes<HTMLDivElement>` 확장.
- 기본 `rounded-xl overflow-hidden` + props:
  - `surface`: `card`(canvas) | `soft`(surface-soft)
  - `bordered`: 1px hairline 보더
  - `interactive`: hover 시 `shadow-soft`
- 5종 합성 카드가 이 컨테이너를 감싼다.

### 5.3 합성 카드 5종 (전부 prop 주입, 데이터 패칭 없음)

**인터랙티브 렌더 규칙(공통)**: `href`가 있으면 카드 루트를 `Link`로 렌더하고
`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas`
+ `rounded-xl`(링이 카드 모서리를 따라가도록)을 적용한다. **focus 영역 = 클릭 영역 = 카드 전체.**
`href`가 없으면 비인터랙티브(`article`/`div`)로 렌더하고 hover·focus 스타일을 끈다.

- **SermonCard** `{ thumbnailUrl, title, preacher, date, href? }`
  16:9 썸네일(상단, 카드와 함께 24px 라운드) + title(`titleMd`) + preacher·date(`datetime`, muted).
  **hover: `shadow-soft` + 썸네일 `group-hover:scale-[1.03]`(transition 0.3s ease).**
  ※ `scale-[1.03]`은 색/px 토큰이 아닌 변환 비율 → arbitrary 예외 허용(주석 명시).
  ※ T03 단계에서 `thumbnailUrl`은 **local path 또는 same-origin `/api/media/{id}`만** 지원
  (외부 URL은 `next.config` remotePatterns 필요 → T10 범위). 쇼케이스는 로컬 플레이스홀더 사용.
- **NoticeRow** `{ title, date, href, isNew? }`
  제목+날짜 가로 행, 하단 1px hairline, **행 전체 클릭 영역**(Link 블록). `isNew` 시 NEW 배지.
- **ScheduleCard** `{ name, time, place }`
  `surface-soft` 배경, 예배명(`titleMd`)+시간(`datetime`)+장소(`bodySm`), 패딩 32, rounded-xl.
- **EventCard** `{ date, title, summary, href? }`
  `badge-pill-primary` 날짜 배지 + 제목(`titleMd`) + 요약(`bodySm`), 1px hairline, 패딩 32.
- **FeatureCard** `{ icon?, title, description }`
  canvas, 패딩 32, 보더 없음. DESIGN 내용 미상세 → icon?+title+description 최소형(가정 명시).

### 5.4 Badge — 서버 컴포넌트
- props `{ variant?: "default" | "primary" }` + children.
- `default`: surface-strong/ink · `primary`: primary-soft/primary. `rounded-sm`(8px — 풀필 칩의
  템플릿 인상 회피, DESIGN.md Shapes 개정), 패딩 4×12, `typo.captionStrong`.
- `badge-pill-primary`는 "NEW"·"이번 주"·캘린더 칩(T12)에 사용.

### 5.5 Input — `"use client"` (`forwardRef` 필수, RHF `register` 연동)
- 네이티브 `InputHTMLAttributes<HTMLInputElement>` 확장 + `variant`, `error?`, `forwardRef`.
- **text-input**(기본): canvas, `rounded-md`, 높이 `h-12`(48) + `px-4`(16), `border border-hairline`.
  - **포커스 2px primary(리플로우 없이)**: `focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary`
    (1px 보더 + 1px 링 = 시각상 2px). border-2 전환 시의 1px 밀림 회피.
- **search-input-pill**: surface-strong, pill, 높이 `h-11`(44) + `px-5`(20), 보더 없음.
- **검증 메시지(a11y 연결)**: `error?: string` → 입력 아래 `typo.caption text-error`.
  error 존재 시 input에 `aria-invalid="true"` + `aria-describedby={`${id}-error`}`, 메시지 요소에
  `id={`${id}-error`}` 부여(스크린리더가 오류를 input과 연결해 낭독). `id` 미전달 시 안정적 fallback
  id 생성(`useId`). 색은 텍스트만(DESIGN: semantic은 폼 메시지 텍스트 전용, 배경·보더 채움 금지).

---

## 6. 검증 (완료 게이트)

### 6.1 쇼케이스 페이지 — `src/app/showcase/page.tsx`
- 전 변형을 흰 섹션 + 다크 밴드(`surface-dark`, outline-on-dark·on-dark 확인용)로 렌더.
- **프로덕션 노출 차단**: `notFound()`는 모듈 top-level이 아니라 **Page 컴포넌트 본문 첫 줄**에서
  호출한다(top-level 호출은 모듈 평가 시점 throw로 build/import 실패 위험):
  ```tsx
  import { notFound } from "next/navigation";
  export default function ShowcasePage() {
    if (process.env.NODE_ENV === "production") notFound();
    return (/* ... */);
  }
  ```
- 썸네일은 로컬/플레이스홀더(원격 호스트 설정은 T10).

### 6.2 게이트 체크리스트
- [ ] Button 5변형 · Card 베이스+5종 · Badge 2변형 · Input 2변형 구현.
- [ ] 색·라운드·간격은 named 토큰 유틸, 컨트롤 치수는 표준 숫자 스케일(§3.4). **브래킷 arbitrary값 0**
  (`bg-[#...]`·`p-[11px]` 금지, `scale-[1.03]` 예외만 주석 명시). hex 인라인 0.
- [ ] SermonCard hover(soft drop + 1.03 줌), Input focus(시각 2px primary).
- [ ] 링크형 카드(SermonCard·NoticeRow·EventCard) — Link 루트 + focus-visible 링, href 없으면 비인터랙티브.
- [ ] DESIGN.md `components:` 정의와 픽셀 단위 일치.
- [ ] 모든 인터랙티브 요소 focus-visible 링 — 키보드 Tab으로 육안 확인.
- [ ] 키보드만으로 전 기능 조작 가능.
- [ ] `pnpm build`·`pnpm lint` 통과.

---

## 7. AGENTS.md 준수 (이 Next.js는 다르다)

구현 직전 `node_modules/next/dist/docs/`에서 **`"use client"` 경계·`next/image`** 관련 변경점을
확인하고 따른다(breaking change 가능). deprecation 통지 준수.

---

## 8. 컴포넌트별 `"use client"` 경계 요약

| 컴포넌트 | 경계 | 이유 |
|---|---|---|
| Button | shared(지시어 없음) | 훅 없음 → 양쪽 사용. `buttonVariants`를 서버에서 호출하려면 client 금지 |
| Input | `"use client"` | `useId`·`forwardRef` (RHF register) |
| Card / Badge / 합성 5종 | 서버 컴포넌트 | 순수 프레젠테이션, hover는 CSS only |

> 단, 합성 카드가 클라이언트 전용 prop(예: onClick 콜백)을 받게 되면 사용처(클라이언트)에서
> 감싸는 것을 원칙으로 한다. T03 카드는 링크(`href`) 기반 내비게이션으로 서버 컴포넌트 유지.
