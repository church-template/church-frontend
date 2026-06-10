# T03 공통 시각 컴포넌트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DESIGN.md 정의대로 Button·Card·Badge·Input 시각 컴포넌트를 직접 구현하고, `/showcase`에서 전 변형을 검증한다.

**Architecture:** T02 토큰(globals.css `@theme` → Tailwind 유틸)만 참조한다. `cn()`(clsx+tailwind-merge)으로 variant 클래스를 병합한다. 시각 프리미티브(Button·Badge·Input·Card 베이스)는 `components/ui/`, 합성 카드 5종은 `components/cards/`. 컨트롤 치수는 Tailwind v4 표준 숫자 스케일(`h-11`·`px-5`…)을 쓰고 브래킷 arbitrary값은 쓰지 않는다.

**Tech Stack:** Next.js 16(App Router) · React 19 · TypeScript · Tailwind CSS v4 · clsx · tailwind-merge

**참조 스펙:** `docs/superpowers/specs/2026-06-10-visual-components-design.md`

---

## 검증 전략 (스펙 §6 확정)

이 플랜은 **유닛 테스트 러너를 도입하지 않는다**(승인된 스펙 결정). 각 Task의 그린 게이트는
**타입체크(`pnpm exec tsc --noEmit`) + 린트(`pnpm lint`)**이고, 통합 검증은 마지막 Task의
`/showcase` 렌더 + `pnpm build` + 수동 a11y(키보드 Tab·focus-visible) 점검이다.

## 커밋 규칙

프로젝트 규칙상 **커밋은 사용자 승인 시에만** 실행한다. 각 Task 끝의 `commit` 단계는 논리적
커밋 경계이며, 실행자는 스테이징 후 사용자 승인을 받아 커밋한다(또는 사용자가 일괄 승인).
커밋 메시지에 **Co-Authored-By 금지**, conventional commits 형식.

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/lib/utils.ts` (생성) | `cn()` className 병합 유틸 |
| `src/app/globals.css` (수정) | `--shadow-soft` 토큰 추가 |
| `docs/church-frontend-guide.md` (수정) | 15.1 표에 clsx+tailwind-merge 행 |
| `src/components/ui/Button.tsx` (생성) | Button + `buttonVariants()` |
| `src/components/ui/Badge.tsx` (생성) | Badge 2변형 |
| `src/components/ui/Input.tsx` (생성) | Input 2변형 + error 연결 |
| `src/components/ui/Card.tsx` (생성) | Card 베이스 컨테이너 |
| `src/components/cards/SermonCard.tsx` (생성) | 설교 카드 |
| `src/components/cards/NoticeRow.tsx` (생성) | 공지 행 |
| `src/components/cards/ScheduleCard.tsx` (생성) | 예배 일정 카드 |
| `src/components/cards/EventCard.tsx` (생성) | 행사 카드 |
| `src/components/cards/FeatureCard.tsx` (생성) | 소개 카드 |
| `src/app/showcase/page.tsx` (생성) | 검증용 쇼케이스(prod 차단) |

---

## Task 1: Foundation — 의존성·cn·그림자 토큰·가이드

**Files:**
- Modify: `package.json` (deps)
- Create: `src/lib/utils.ts`
- Modify: `src/app/globals.css`
- Modify: `docs/church-frontend-guide.md` (15.1 표)

- [ ] **Step 1: 의존성 설치**

Run:
```bash
pnpm add clsx tailwind-merge
```
Expected: `package.json` dependencies에 `clsx`, `tailwind-merge` 추가, lockfile 갱신.

- [ ] **Step 2: `cn()` 유틸 생성**

Create `src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// className 병합·충돌 해소(shadcn 표준 cn). variant 클래스 + 소비자 className override 안전.
// 위치는 shadcn 기본 경로(@/lib/utils) — T04 동작 컴포넌트가 무수정 import.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: 그림자 토큰 추가**

`src/app/globals.css`의 `@theme { ... }` 블록 안, `--radius-full: 9999px;` 다음 줄에 추가:
```css

  /* --- 그림자 (DESIGN Elevation의 유일한 단계) --- */
  --shadow-soft: 0 4px 12px rgba(0, 0, 0, 0.04);
```
이유: hover soft drop을 인라인이 아닌 `shadow-soft` 유틸로 참조. rgba는 토큰 단일 진실 안에서만 정의.

- [ ] **Step 4: 가이드 15.1 표에 행 추가**

`docs/church-frontend-guide.md`에서 `| 날짜 | **date-fns** |` 행을 찾아 그 **아래**에 추가:
```
| 클래스 유틸 | **clsx + tailwind-merge** | `cn()`(`src/lib/utils.ts`)로 variant className 병합·충돌 해소. 시각(T3)·동작(T4 shadcn) 컴포넌트 공유 |
```

- [ ] **Step 5: 타입체크·린트**

Run:
```bash
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 에러 0 (cn 임포트 해석 성공).

- [ ] **Step 6: Commit (승인 후)**

```bash
git add package.json pnpm-lock.yaml src/lib/utils.ts src/app/globals.css docs/church-frontend-guide.md
git commit -m "chore : cn 유틸·shadow-soft 토큰·clsx 의존성 추가 #3"
```

---

## Task 2: Button + buttonVariants

**Files:**
- Create: `src/components/ui/Button.tsx`

- [ ] **Step 1: Button 구현**

Create `src/components/ui/Button.tsx`:
```tsx
// 클라이언트 지시어 없음(shared 컴포넌트): 훅·상태 없이 prop만 전달 → 서버·클라이언트 양쪽에서 사용 가능.
// buttonVariants를 서버 컴포넌트(링크형 CTA)에서 호출하려면 "use client"가 없어야 한다.
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outlineOnDark"
  | "tertiary"
  | "pillCta";

// 모든 variant: 색·상태·focus-visible 링을 토큰 유틸로만 표현. 높이는 표준 숫자 스케일로 고정.
const variantClass: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-primary text-on-primary rounded-pill h-11 px-5",
    "active:bg-primary-active",
    "disabled:bg-primary-disabled disabled:text-on-primary",
    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
  ),
  secondary: cn(
    "bg-surface-strong text-ink rounded-pill h-11 px-5",
    "disabled:bg-surface-strong disabled:text-muted",
    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
  ),
  outlineOnDark: cn(
    "bg-transparent text-on-dark border border-on-dark rounded-pill h-11 px-5",
    "disabled:opacity-50",
    "focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark",
  ),
  tertiary: cn(
    "bg-transparent text-primary rounded-sm",
    "disabled:opacity-50",
    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
  ),
  pillCta: cn(
    "bg-primary text-on-primary rounded-pill h-14 px-8",
    "active:bg-primary-active",
    "disabled:bg-primary-disabled disabled:text-on-primary",
    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
  ),
};

const baseClass = cn(
  typo.button,
  "inline-flex items-center justify-center",
  "transition-colors outline-none",
  "disabled:cursor-not-allowed",
);

// className 문자열만 반환 → 링크형 CTA에 <Link className={buttonVariants("pillCta")}> 로 사용.
export function buttonVariants(variant: ButtonVariant = "primary") {
  return cn(baseClass, variantClass[variant]);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants(variant), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
```

- [ ] **Step 2: 타입체크·린트**

Run:
```bash
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 에러 0.

- [ ] **Step 3: Commit (승인 후)**

```bash
git add src/components/ui/Button.tsx
git commit -m "feat : Button 5변형·buttonVariants 직접 구현 #3"
```

---

## Task 3: Badge

**Files:**
- Create: `src/components/ui/Badge.tsx`

- [ ] **Step 1: Badge 구현**

Create `src/components/ui/Badge.tsx`:
```tsx
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary";
}

const variantClass = {
  default: "bg-surface-strong text-ink",
  primary: "bg-primary-soft text-primary",
} as const;

// 서버 컴포넌트(순수 표시). py-1=4px, px-3=12px.
export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        typo.captionStrong,
        "inline-flex items-center rounded-pill py-1 px-3",
        variantClass[variant],
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 2: 타입체크·린트**

Run:
```bash
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 에러 0.

- [ ] **Step 3: Commit (승인 후)**

```bash
git add src/components/ui/Badge.tsx
git commit -m "feat : Badge 2변형 직접 구현 #3"
```

---

## Task 4: Input

**Files:**
- Create: `src/components/ui/Input.tsx`

- [ ] **Step 1: Input 구현**

Create `src/components/ui/Input.tsx`:
```tsx
"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export type InputVariant = "text" | "searchPill";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  error?: string;
}

// text: 1px hairline + 포커스 시 border 1px + ring 1px = 시각상 2px primary(리플로우 없음).
const variantClass: Record<InputVariant, string> = {
  text: cn(
    "bg-canvas rounded-md h-12 px-4 border border-hairline",
    "focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary",
  ),
  searchPill: cn(
    "bg-surface-strong rounded-pill h-11 px-5",
    "focus-visible:ring-1 focus-visible:ring-primary",
  ),
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = "text", error, className, id, ...props }, ref) => {
    const reactId = useId();
    const inputId = id ?? reactId;
    const errorId = `${inputId}-error`;
    return (
      <div className="flex flex-col gap-xxs">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            typo.bodyMd,
            "w-full text-ink outline-none placeholder:text-muted",
            variantClass[variant],
            className,
          )}
          {...props}
        />
        {error ? (
          <span id={errorId} className={cn(typo.caption, "text-error")}>
            {error}
          </span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
```

- [ ] **Step 2: 타입체크·린트**

Run:
```bash
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 에러 0.

- [ ] **Step 3: Commit (승인 후)**

```bash
git add src/components/ui/Input.tsx
git commit -m "feat : Input 2변형·오류 a11y 연결 직접 구현 #3"
```

---

## Task 5: Card 베이스

**Files:**
- Create: `src/components/ui/Card.tsx`

- [ ] **Step 1: Card 베이스 구현**

Create `src/components/ui/Card.tsx`:
```tsx
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  surface?: "card" | "soft";
  bordered?: boolean;
  interactive?: boolean; // hover 시 soft drop
}

// 모든 카드가 공유하는 컨테이너. rounded-xl(24px) 고정. 그림자는 hover soft-drop 하나만.
export function Card({
  surface = "card",
  bordered = false,
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden",
        surface === "soft" ? "bg-surface-soft" : "bg-surface-card",
        bordered && "border border-hairline",
        interactive && "transition-shadow hover:shadow-soft",
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 2: 타입체크·린트**

Run:
```bash
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 에러 0.

- [ ] **Step 3: Commit (승인 후)**

```bash
git add src/components/ui/Card.tsx
git commit -m "feat : Card 베이스 컨테이너 직접 구현 #3"
```

---

## Task 6: SermonCard

**Files:**
- Create: `src/components/cards/SermonCard.tsx`

참고: 썸네일은 프레젠테이션 셸이므로 `<img>`로 렌더한다(실제 최적화 이미지는 T10에서 next/image로 교체). `@next/next/no-img-element` 룰은 사유 주석과 함께 라인 비활성화. `href`가 있으면 `next/link` 루트로 감싸 focus-visible 링을 카드 전체에 부여한다.

- [ ] **Step 1: SermonCard 구현**

Create `src/components/cards/SermonCard.tsx`:
```tsx
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface SermonCardProps {
  thumbnailUrl: string; // local path 또는 same-origin /api/media/{id} (외부 URL은 T10)
  title: string;
  preacher: string;
  date: string;
  href?: string;
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-xl";

export function SermonCard({
  thumbnailUrl,
  title,
  preacher,
  date,
  href,
}: SermonCardProps) {
  // href 있을 때만 hover 줌이 작동하도록 group-hover를 조건부 부여(비인터랙티브 시 hover 없음).
  const inner = (
    <>
      <div className="aspect-video overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- T03 프레젠테이션 셸; 최적화 이미지는 T10에서 next/image로 교체 */}
        <img
          src={thumbnailUrl}
          alt=""
          className={cn(
            "h-full w-full object-cover",
            href &&
              "transition-transform duration-300 ease-out group-hover:scale-[1.03]",
          )}
        />
      </div>
      <div className="p-xl">
        <h3 className={cn(typo.titleMd, "text-ink")}>{title}</h3>
        <p className={cn(typo.datetime, "mt-xxs text-muted")}>
          {preacher} · {date}
        </p>
      </div>
    </>
  );

  // 비인터랙티브: hover/focus 없음. 인터랙티브: Link 루트 + focus 링 + hover soft drop·줌.
  if (!href) {
    return <Card bordered>{inner}</Card>;
  }
  return (
    <Link href={href} className={cn("block", focusRing)}>
      <Card bordered interactive className="group block">
        {inner}
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: 타입체크·린트**

Run:
```bash
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 에러 0 (img 룰은 라인 비활성화로 통과).

- [ ] **Step 3: Commit (승인 후)**

```bash
git add src/components/cards/SermonCard.tsx
git commit -m "feat : SermonCard 직접 구현 #3"
```

---

## Task 7: NoticeRow

**Files:**
- Create: `src/components/cards/NoticeRow.tsx`

- [ ] **Step 1: NoticeRow 구현**

Create `src/components/cards/NoticeRow.tsx`:
```tsx
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface NoticeRowProps {
  title: string;
  date: string;
  href: string; // 행 전체가 링크
  isNew?: boolean;
}

// 제목+날짜 가로 행, 하단 hairline. 클릭/포커스 영역 = 행 전체. py-base=16px.
export function NoticeRow({ title, date, href, isNew = false }: NoticeRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-base border-b border-hairline py-base",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
      )}
    >
      <span className="flex min-w-0 items-center gap-xs">
        {isNew ? <Badge variant="primary">NEW</Badge> : null}
        <span className={cn(typo.titleSm, "truncate text-ink")}>{title}</span>
      </span>
      <span className={cn(typo.datetime, "shrink-0 text-muted")}>{date}</span>
    </Link>
  );
}
```

- [ ] **Step 2: 타입체크·린트**

Run:
```bash
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 에러 0.

- [ ] **Step 3: Commit (승인 후)**

```bash
git add src/components/cards/NoticeRow.tsx
git commit -m "feat : NoticeRow 직접 구현 #3"
```

---

## Task 8: ScheduleCard

**Files:**
- Create: `src/components/cards/ScheduleCard.tsx`

- [ ] **Step 1: ScheduleCard 구현**

Create `src/components/cards/ScheduleCard.tsx`:
```tsx
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface ScheduleCardProps {
  name: string;
  time: string;
  place: string;
}

// surface-soft 배경, 패딩 32(p-xl). 예배명·시간·장소.
export function ScheduleCard({ name, time, place }: ScheduleCardProps) {
  return (
    <Card surface="soft" className="p-xl">
      <h3 className={cn(typo.titleMd, "text-ink")}>{name}</h3>
      <p className={cn(typo.datetime, "mt-xs text-body")}>{time}</p>
      <p className={cn(typo.bodySm, "mt-xxs text-muted")}>{place}</p>
    </Card>
  );
}
```

- [ ] **Step 2: 타입체크·린트**

Run:
```bash
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 에러 0.

- [ ] **Step 3: Commit (승인 후)**

```bash
git add src/components/cards/ScheduleCard.tsx
git commit -m "feat : ScheduleCard 직접 구현 #3"
```

---

## Task 9: EventCard

**Files:**
- Create: `src/components/cards/EventCard.tsx`

- [ ] **Step 1: EventCard 구현**

Create `src/components/cards/EventCard.tsx`:
```tsx
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface EventCardProps {
  date: string;
  title: string;
  summary: string;
  href?: string;
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-xl";

// 날짜 배지(primary) + 제목 + 요약. hairline, 패딩 32.
export function EventCard({ date, title, summary, href }: EventCardProps) {
  const inner = (
    <>
      <Badge variant="primary">{date}</Badge>
      <h3 className={cn(typo.titleMd, "mt-base text-ink")}>{title}</h3>
      <p className={cn(typo.bodySm, "mt-xs text-body")}>{summary}</p>
    </>
  );

  // 비인터랙티브: hover/focus 없음. 인터랙티브: Link 루트 + focus 링 + hover soft drop.
  if (!href) {
    return (
      <Card bordered className="p-xl">
        {inner}
      </Card>
    );
  }
  return (
    <Link href={href} className={cn("block", focusRing)}>
      <Card bordered interactive className="block p-xl">
        {inner}
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: 타입체크·린트**

Run:
```bash
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 에러 0.

- [ ] **Step 3: Commit (승인 후)**

```bash
git add src/components/cards/EventCard.tsx
git commit -m "feat : EventCard 직접 구현 #3"
```

---

## Task 10: FeatureCard

**Files:**
- Create: `src/components/cards/FeatureCard.tsx`

참고: DESIGN.md에 내용이 미상세하므로 `icon?+title+description` 최소형으로 구현(가정). canvas·패딩 32·보더 없음.

- [ ] **Step 1: FeatureCard 구현**

Create `src/components/cards/FeatureCard.tsx`:
```tsx
import { type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface FeatureCardProps {
  icon?: ReactNode;
  title: string;
  description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="p-xl">
      {icon ? <div className="mb-base text-primary">{icon}</div> : null}
      <h3 className={cn(typo.titleMd, "text-ink")}>{title}</h3>
      <p className={cn(typo.bodyMd, "mt-xs text-body")}>{description}</p>
    </Card>
  );
}
```

- [ ] **Step 2: 타입체크·린트**

Run:
```bash
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 에러 0.

- [ ] **Step 3: Commit (승인 후)**

```bash
git add src/components/cards/FeatureCard.tsx
git commit -m "feat : FeatureCard 직접 구현 #3"
```

---

## Task 11: Showcase 페이지 + 최종 검증 게이트

**Files:**
- Create: `src/app/showcase/page.tsx`

- [ ] **Step 1: Showcase 구현**

Create `src/app/showcase/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { SermonCard } from "@/components/cards/SermonCard";
import { NoticeRow } from "@/components/cards/NoticeRow";
import { ScheduleCard } from "@/components/cards/ScheduleCard";
import { EventCard } from "@/components/cards/EventCard";
import { FeatureCard } from "@/components/cards/FeatureCard";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

// 컴포넌트 검증 전용 — 프로덕션 미노출.
export default function ShowcasePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex max-w-[var(--container-max)] flex-col gap-section px-lg py-section">
      {/* Buttons */}
      <section className="flex flex-col gap-base">
        <h2 className={cn(typo.titleLg, "text-ink")}>Button</h2>
        <div className="flex flex-wrap items-center gap-base">
          <Button variant="primary">기본 CTA</Button>
          <Button variant="primary" disabled>비활성</Button>
          <Button variant="secondary">보조</Button>
          <Button variant="tertiary">텍스트 버튼</Button>
          <Button variant="pillCta">새가족 안내</Button>
          <Link href="#" className={buttonVariants("pillCta")}>
            링크형 CTA
          </Link>
        </div>
      </section>

      {/* Dark band — outline-on-dark */}
      <section className="flex flex-wrap items-center gap-base rounded-xl bg-surface-dark p-xl">
        <Button variant="outlineOnDark">오시는 길</Button>
        <Button variant="outlineOnDark" disabled>
          비활성
        </Button>
      </section>

      {/* Badges */}
      <section className="flex flex-col gap-base">
        <h2 className={cn(typo.titleLg, "text-ink")}>Badge</h2>
        <div className="flex items-center gap-base">
          <Badge>기본</Badge>
          <Badge variant="primary">이번 주</Badge>
        </div>
      </section>

      {/* Inputs */}
      <section className="flex max-w-md flex-col gap-base">
        <h2 className={cn(typo.titleLg, "text-ink")}>Input</h2>
        <Input placeholder="이름을 입력하세요" />
        <Input placeholder="이메일" error="이메일 형식이 올바르지 않습니다" />
        <Input variant="searchPill" placeholder="검색" />
      </section>

      {/* Cards */}
      <section className="flex flex-col gap-base">
        <h2 className={cn(typo.titleLg, "text-ink")}>Cards</h2>
        <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
          <SermonCard
            thumbnailUrl="/window.svg"
            title="은혜의 강가에서"
            preacher="김목사"
            date="2026.06.08"
            href="#"
          />
          <ScheduleCard name="주일 1부 예배" time="오전 09:00" place="본당" />
          <EventCard
            date="06.15"
            title="여름 수련회"
            summary="온 교우가 함께하는 여름 수련회에 초대합니다."
            href="#"
          />
          <FeatureCard
            title="처음 오셨나요?"
            description="새가족 등록과 안내를 도와드립니다."
          />
        </div>
        <Card className="p-xl">
          <NoticeRow title="2026년 상반기 제직회 안내" date="2026.06.05" href="#" isNew />
          <NoticeRow title="주차장 공사 안내" date="2026.06.01" href="#" />
        </Card>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: 타입체크·린트·빌드**

Run:
```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm build
```
Expected: 전부 통과(에러 0).

- [ ] **Step 3: 수동 a11y·픽셀 점검**

Run:
```bash
pnpm dev
```
브라우저에서 `http://localhost:3000/showcase` 열고 확인:
- [ ] Tab 키로 모든 버튼·입력·링크 카드 순회 시 **focus-visible 링**이 보인다.
- [ ] text-input 포커스 시 **2px primary** 테두리(리플로우 없음).
- [ ] SermonCard hover 시 soft drop + 썸네일 1.03배 줌.
- [ ] 다크 밴드의 outline-on-dark 버튼이 흰 텍스트·링으로 보인다.
- [ ] 모든 카드 모서리 24px, 모든 버튼 pill, 디스플레이/텍스트가 DESIGN.md와 일치.

- [ ] **Step 4: Commit (승인 후)**

```bash
git add src/app/showcase/page.tsx
git commit -m "feat : 시각 컴포넌트 검증용 쇼케이스 페이지 #3"
```

---

## 완료 조건 (스펙 §6.2 게이트)

- [ ] Button 5변형 · Card 베이스+5종 · Badge 2변형 · Input 2변형 구현.
- [ ] 색·라운드·간격은 named 토큰, 컨트롤 치수는 표준 숫자 스케일. 브래킷 arbitrary값 0(`scale-[1.03]`·`max-w-[var(--container-max)]` 예외만).
- [ ] SermonCard hover, Input focus 2px, 링크형 카드 focus-visible.
- [ ] 키보드만으로 전 기능 조작 가능.
- [ ] `pnpm exec tsc --noEmit` · `pnpm lint` · `pnpm build` 통과.
