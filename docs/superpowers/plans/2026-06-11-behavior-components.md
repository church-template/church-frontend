# T04 공통 동작 컴포넌트(shadcn 재스킨) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 동작 중심 컴포넌트 7종(Dialog·Sheet·Toast·Popover·DropdownMenu·Select·Tabs)을 Radix/sonner 소스로 수동 벤더링한 뒤 DESIGN.md 토큰으로 재스킨하고, 접근성 동작을 보존한 채 `/showcase`로 검증한다.

**Architecture:** shadcn `init`을 쓰지 않고 레지스트리 소스를 `src/components/ui/`에 수동 복사한 뒤 className을 우리 토큰 유틸(T03 idiom)로 즉시 재작성한다. shadcn 시맨틱 변수 레이어(`--background` 등)·`tw-animate-css`는 도입하지 않고, z-index·애니메이션은 `globals.css`에 자체 토큰/키프레임으로 정의한다. Toast는 루트 layout 전역 컨테이너 + `notify` seam(client 전용)으로 단일화한다.

**Tech Stack:** Next 16(App Router) · React 19 · Tailwind v4(`@theme`/`@utility`) · `@radix-ui/react-*` · `sonner` · `lucide-react` · `cn()`(clsx+tailwind-merge)

**커밋 규칙:** 프로젝트 CLAUDE.md상 커밋은 **사용자 승인 시에만** 수행한다. 각 Task의 commit 스텝은 작성해 두되, 실제 실행은 사용자 승인(또는 `/cr`) 후 일괄/개별로 한다. Co-Authored-By 태그 금지.

**참조 스펙:** `docs/superpowers/specs/2026-06-11-behavior-components-design.md`

---

## File Structure

생성/수정 파일과 각 책임:

- **수정** `src/app/globals.css` — z-index 토큰·모달 폭 토큰·애니메이션 토큰 + `@utility` z 클래스 + `@keyframes` + reduced-motion.
- **수정** `.claude/rules/DESIGN.md` — "레이어링(z-index)" 항목 추가(토큰 단일 진실).
- **수정** `docs/church-frontend-guide.md` — 15.1 표에 Radix·sonner 의존성 1줄.
- **생성** `src/components/ui/dialog.tsx` — Radix Dialog 재스킨(Modal).
- **생성** `src/components/ui/sheet.tsx` — Radix Dialog 기반 슬라이드 패널.
- **생성** `src/components/ui/popover.tsx` — Radix Popover 재스킨.
- **생성** `src/components/ui/dropdown-menu.tsx` — Radix DropdownMenu 재스킨.
- **생성** `src/components/ui/select.tsx` — Radix Select 재스킨.
- **생성** `src/components/ui/tabs.tsx` — Radix Tabs 재스킨.
- **생성** `src/components/ui/sonner.tsx` — sonner `<Toaster />` 재스킨(전역 컨테이너).
- **생성** `src/lib/notify.ts` — Toast 출력 seam(`notify.success/error`, client 전용).
- **수정** `src/app/layout.tsx` — 전역 `<Toaster />` 마운트.
- **생성** `src/app/showcase/_behavior/BehaviorShowcase.tsx` — 동작 컴포넌트 데모(client).
- **수정** `src/app/showcase/page.tsx` — 데모 섹션 추가.

각 ui 파일은 단일 컴포넌트군 책임(파일 1개 = Radix primitive 1개 래핑). lowercase 파일명은 shadcn 관례 + allowlist 검수 기준과 일치한다.

---

## Task 1: 선행 조사 + 의존성 설치

**Files:**
- 조사: `node_modules/next/dist/docs/01-app/`
- Modify: `package.json` (pnpm add가 갱신)

- [ ] **Step 1: 이 Next의 클라이언트/레이아웃 규약 정독 (AGENTS.md)**

Run:
```bash
ls node_modules/next/dist/docs/01-app/
ls node_modules/next/dist/docs/01-app/03-building-your-application/01-rendering 2>/dev/null || true
```
이어서 "client components"·"layouts"·"metadata" 관련 `.md`를 Read로 읽는다. 확인 포인트: 서버 컴포넌트(layout)에서 client 컴포넌트(`<Toaster />`)를 자식으로 렌더하는 경계, `"use client"` 지시어 위치. 일반 Next와 다른 deprecation이 있으면 메모.

- [ ] **Step 2: 런타임 의존성 설치**

Run:
```bash
pnpm add @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs sonner lucide-react
```
Expected: 7개 패키지가 `dependencies`에 추가되고 설치 성공.

- [ ] **Step 3: 설치 검증**

Run:
```bash
pnpm exec tsc --noEmit && node -e "require.resolve('sonner'); require.resolve('lucide-react'); require.resolve('@radix-ui/react-dialog'); console.log('ok')"
```
Expected: 타입 에러 없음 + `ok` 출력.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: T04 동작 컴포넌트용 Radix·sonner·lucide 의존성 추가"
```

---

## Task 2: 디자인 토큰 — z-index · 모달 폭 · 애니메이션

**Files:**
- Modify: `src/app/globals.css`
- Modify: `.claude/rules/DESIGN.md`
- Modify: `docs/church-frontend-guide.md`

- [ ] **Step 1: globals.css `@theme`에 토큰 추가**

`src/app/globals.css`의 `@theme { ... }` 블록 안, `--shadow-soft` 줄(48행) 바로 다음에 삽입:

```css
  /* --- 레이어(z-index) — portal이 고정 네비(z-nav) 위에 뜨도록(T04) --- */
  --z-nav: 10;
  --z-popover: 40;
  --z-overlay: 50;
  --z-toast: 60;

  /* --- 모달 폭 (max-w t-shirt 토큰 충돌 회피: 항상 var()로 참조) --- */
  --container-modal: 32rem;

  /* --- 동작 컴포넌트 애니메이션 (자체 키프레임, tw-animate-css 미사용, T04) --- */
  --animate-overlay-in: overlay-in 0.2s ease;
  --animate-overlay-out: overlay-out 0.15s ease;
  --animate-content-in: content-in 0.2s ease;     /* Dialog: translate(-50%,-50%) 포함 */
  --animate-content-out: content-out 0.15s ease;
  --animate-popover-in: popover-in 0.18s ease;     /* 플로팅: scale만(Radix popper transform 보존) */
  --animate-popover-out: popover-out 0.12s ease;
  --animate-slide-in-right: slide-in-right 0.25s ease;
  --animate-slide-out-right: slide-out-right 0.2s ease;
  --animate-slide-in-left: slide-in-left 0.25s ease;
  --animate-slide-out-left: slide-out-left 0.2s ease;
```

- [ ] **Step 2: globals.css 하단에 `@utility`·`@keyframes`·reduced-motion 추가**

파일 맨 끝(`body { ... }` 다음)에 추가:

```css
/* ============================================================
 * 동작 컴포넌트(T04) — z-index 유틸(토큰 참조) · 자체 키프레임
 * ============================================================ */
@utility z-nav { z-index: var(--z-nav); }
@utility z-popover { z-index: var(--z-popover); }
@utility z-overlay { z-index: var(--z-overlay); }
@utility z-toast { z-index: var(--z-toast); }

@keyframes overlay-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes overlay-out { from { opacity: 1 } to { opacity: 0 } }

/* Dialog는 -translate-x-1/2 -translate-y-1/2로 중앙 정렬 → 키프레임이 그 transform을 유지해야 점프가 없다 */
@keyframes content-in {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.96) }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1) }
}
@keyframes content-out {
  from { opacity: 1; transform: translate(-50%, -50%) scale(1) }
  to   { opacity: 0; transform: translate(-50%, -50%) scale(0.96) }
}

/* Popover/Select/Dropdown은 Radix popper가 위치 transform을 관리 → scale만 건드린다 */
@keyframes popover-in { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: scale(1) } }
@keyframes popover-out { from { opacity: 1; transform: scale(1) } to { opacity: 0; transform: scale(0.96) } }

@keyframes slide-in-right { from { transform: translateX(100%) } to { transform: translateX(0) } }
@keyframes slide-out-right { from { transform: translateX(0) } to { transform: translateX(100%) } }
@keyframes slide-in-left { from { transform: translateX(-100%) } to { transform: translateX(0) } }
@keyframes slide-out-left { from { transform: translateX(0) } to { transform: translateX(-100%) } }

/* 접근성 — 모션 최소화 선호 시 애니메이션 제거 */
@media (prefers-reduced-motion: reduce) {
  [data-state] { animation: none !important; }
}
```

- [ ] **Step 3: DESIGN.md에 레이어링 항목 추가**

`.claude/rules/DESIGN.md`의 "## 깊이 (Elevation)" 섹션 바로 앞(또는 "## 모양 (Shapes)" 앞)에 삽입:

```markdown
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
```

- [ ] **Step 4: 가이드 15.1 표에 의존성 1줄 추가**

`docs/church-frontend-guide.md`의 15.1 표에서 `| 아이콘 | **lucide-react** | ...` 행 **다음**에 추가:

```markdown
| 동작 컴포넌트 엔진 | **@radix-ui/react-*** + **sonner** | shadcn 도입분(Dialog·Sheet·Popover·DropdownMenu·Select·Tabs=Radix, Toast=sonner)의 동작 엔진. 컴포넌트 소스는 `src/components/ui/`에 수동 벤더링 후 토큰 재스킨(T04). 직접 import는 ui 래퍼 경유 |
```

- [ ] **Step 5: 빌드 검증**

Run:
```bash
pnpm build
```
Expected: 빌드 성공(CSS 파싱 에러 없음). 토큰만 추가했으므로 시각 변화 없음.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css .claude/rules/DESIGN.md docs/church-frontend-guide.md
git commit -m "feat: T04 동작 컴포넌트용 z-index·모달폭·애니메이션 토큰 추가"
```

---

## Task 3: Dialog (Modal)

**Files:**
- Create: `src/components/ui/dialog.tsx`

- [ ] **Step 1: dialog.tsx 작성**

```tsx
"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-overlay bg-surface-dark/40",
      "data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-overlay grid w-full max-w-[var(--container-modal)] -translate-x-1/2 -translate-y-1/2 gap-base",
        "rounded-xl border border-hairline bg-surface-card p-xl text-ink shadow-soft",
        "data-[state=open]:animate-content-in data-[state=closed]:animate-content-out",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className={cn(
          "absolute right-base top-base rounded-sm p-xxs text-muted transition-colors hover:text-ink",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        )}
        aria-label="닫기"
      >
        <X size={20} aria-hidden />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-xs", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-base flex justify-end gap-sm", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(typo.titleLg, "text-ink", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(typo.bodyMd, "text-body", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
```

- [ ] **Step 2: 타입 검증**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (에러 없음). 실사용은 Task 10 데모에서 확인.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/dialog.tsx
git commit -m "feat: Dialog(Modal) 컴포넌트 토큰 재스킨 도입"
```

---

## Task 4: Sheet

**Files:**
- Create: `src/components/ui/sheet.tsx`

- [ ] **Step 1: sheet.tsx 작성**

`@radix-ui/react-dialog`를 슬라이드 패널로 재사용한다.

```tsx
"use client";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = forwardRef<
  ElementRef<typeof SheetPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-overlay bg-surface-dark/40",
      "data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

type SheetSide = "right" | "left";

const sheetSide: Record<SheetSide, string> = {
  right:
    "inset-y-0 right-0 h-full w-3/4 max-w-[var(--container-modal)] data-[state=open]:animate-slide-in-right data-[state=closed]:animate-slide-out-right",
  left:
    "inset-y-0 left-0 h-full w-3/4 max-w-[var(--container-modal)] data-[state=open]:animate-slide-in-left data-[state=closed]:animate-slide-out-left",
};

const SheetContent = forwardRef<
  ElementRef<typeof SheetPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & { side?: SheetSide }
>(({ className, children, side = "right", ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-overlay flex flex-col gap-base bg-surface-card p-xl text-ink shadow-soft",
        sheetSide[side],
        className,
      )}
      {...props}
    >
      {children}
      <SheetPrimitive.Close
        className="absolute right-base top-base rounded-sm p-xxs text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        aria-label="닫기"
      >
        <X size={20} aria-hidden />
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetTitle = forwardRef<
  ElementRef<typeof SheetPrimitive.Title>,
  ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn(typo.titleLg, "text-ink", className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = forwardRef<
  ElementRef<typeof SheetPrimitive.Description>,
  ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn(typo.bodyMd, "text-body", className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetDescription,
};
```

- [ ] **Step 2: 타입 검증**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/sheet.tsx
git commit -m "feat: Sheet(슬라이드 패널) 컴포넌트 토큰 재스킨 도입"
```

---

## Task 5: Toast (sonner) + notify seam + 전역 마운트

**Files:**
- Create: `src/components/ui/sonner.tsx`
- Create: `src/lib/notify.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: sonner.tsx (재스킨 Toaster) 작성**

```tsx
"use client";

import { Toaster as SonnerToaster } from "sonner";
import { CircleCheck, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

// 전역 Toast 컨테이너 1개. DESIGN: semantic 색은 아이콘/텍스트에만(배경 채움 금지) → richColors 미사용.
export function Toaster() {
  return (
    <SonnerToaster
      theme="light"
      position="top-center"
      duration={4000}
      icons={{
        success: <CircleCheck size={18} className="text-success" aria-hidden />,
        error: <CircleAlert size={18} className="text-error" aria-hidden />,
      }}
      toastOptions={{
        classNames: {
          toast: cn(
            "z-toast flex items-center gap-sm rounded-lg border border-hairline bg-surface-card p-base text-ink shadow-soft",
          ),
          title: cn(typo.titleSm, "text-ink"),
          description: cn(typo.bodySm, "text-body"),
        },
      }}
    />
  );
}
```

> 주의: lucide 아이콘 명이 설치 버전과 다르면 `tsc`가 잡는다. `CircleCheck`/`CircleAlert`가 없으면 `CheckCircle2`/`AlertCircle`로 교체.

- [ ] **Step 2: notify.ts (출력 seam) 작성**

```ts
"use client";

import { toast } from "sonner";

// Toast 출력 단일 채널. T06 errorCode→UI 매핑(가이드 4.2)은 이 seam만 호출한다.
// client 컴포넌트·이벤트 핸들러 전용 — 서버 컴포넌트/서버 액션에서 import·호출 금지.
export const notify = {
  success: (message: string) => toast.success(message, { duration: 4000 }),
  error: (message: string) => toast.error(message, { duration: 4000 }),
};
```

- [ ] **Step 3: layout.tsx에 전역 Toaster 마운트**

`src/app/layout.tsx`를 수정한다. import 추가:

```tsx
import { Toaster } from "@/components/ui/sonner";
```

`<body>` 내부 `{children}` **다음**에 `<Toaster />`를 둔다:

```tsx
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
```

- [ ] **Step 4: 타입 + 빌드 검증**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: PASS. (서버 layout이 client `<Toaster />`를 자식으로 렌더 — Task 1 Step 1에서 확인한 경계.)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/sonner.tsx src/lib/notify.ts src/app/layout.tsx
git commit -m "feat: Toast 전역 컨테이너 + notify seam 도입(토큰 재스킨)"
```

---

## Task 6: Popover

**Files:**
- Create: `src/components/ui/popover.tsx`

- [ ] **Step 1: popover.tsx 작성**

```tsx
"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";
import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = forwardRef<
  ElementRef<typeof PopoverPrimitive.Content>,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 8, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-popover w-72 rounded-xl border border-hairline bg-surface-card p-base text-ink shadow-soft",
        "data-[state=open]:animate-popover-in data-[state=closed]:animate-popover-out",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent };
```

- [ ] **Step 2: 타입 검증**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/popover.tsx
git commit -m "feat: Popover 컴포넌트 토큰 재스킨 도입"
```

---

## Task 7: DropdownMenu

**Files:**
- Create: `src/components/ui/dropdown-menu.tsx`

- [ ] **Step 1: dropdown-menu.tsx 작성**

```tsx
"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuContent = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-popover min-w-48 overflow-hidden rounded-xl border border-hairline bg-surface-card p-xxs text-ink shadow-soft",
        "data-[state=open]:animate-popover-in data-[state=closed]:animate-popover-out",
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Item>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      typo.bodySm,
      "relative flex cursor-pointer select-none items-center gap-sm rounded-md px-sm py-xs text-body outline-none",
      "focus:bg-surface-soft focus:text-ink",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuLabel = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Label>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(typo.captionStrong, "px-sm py-xs text-muted", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-xxs my-xxs h-px bg-hairline", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};
```

- [ ] **Step 2: 타입 검증**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/dropdown-menu.tsx
git commit -m "feat: DropdownMenu 컴포넌트 토큰 재스킨 도입"
```

---

## Task 8: Select

**Files:**
- Create: `src/components/ui/select.tsx`

- [ ] **Step 1: select.tsx 작성**

```tsx
"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = forwardRef<
  ElementRef<typeof SelectPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      typo.bodyMd,
      "flex h-11 w-full items-center justify-between gap-sm rounded-md border border-hairline bg-surface-card px-base text-ink",
      "data-[placeholder]:text-muted",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown size={18} className="text-muted" aria-hidden />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = forwardRef<
  ElementRef<typeof SelectPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        "z-popover overflow-hidden rounded-xl border border-hairline bg-surface-card text-ink shadow-soft",
        "data-[state=open]:animate-popover-in data-[state=closed]:animate-popover-out",
        position === "popper" &&
          "min-w-[var(--radix-select-trigger-width)]",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-xxs text-muted">
        <ChevronUp size={16} aria-hidden />
      </SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport className="p-xxs">
        {children}
      </SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-xxs text-muted">
        <ChevronDown size={16} aria-hidden />
      </SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = forwardRef<
  ElementRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      typo.bodySm,
      "relative flex w-full cursor-pointer select-none items-center rounded-md py-xs pl-sm pr-xl text-body outline-none",
      "focus:bg-surface-soft focus:text-ink",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute right-sm flex items-center">
      <SelectPrimitive.ItemIndicator>
        <Check size={16} className="text-primary" aria-hidden />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectLabel = forwardRef<
  ElementRef<typeof SelectPrimitive.Label>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(typo.captionStrong, "px-sm py-xs text-muted", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectSeparator = forwardRef<
  ElementRef<typeof SelectPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-xxs my-xxs h-px bg-hairline", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
};
```

- [ ] **Step 2: 타입 검증**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/select.tsx
git commit -m "feat: Select 컴포넌트 토큰 재스킨 도입"
```

---

## Task 9: Tabs

**Files:**
- Create: `src/components/ui/tabs.tsx`

- [ ] **Step 1: tabs.tsx 작성**

```tsx
"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

const Tabs = TabsPrimitive.Root;

const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("inline-flex items-center gap-xs border-b border-hairline", className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      typo.navLink,
      "relative -mb-px inline-flex items-center border-b-2 border-transparent px-base py-sm text-muted outline-none",
      "hover:text-ink",
      "data-[state=active]:border-primary data-[state=active]:text-ink",
      "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
      "disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("pt-base outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
```

- [ ] **Step 2: 타입 검증**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/tabs.tsx
git commit -m "feat: Tabs 컴포넌트 토큰 재스킨 도입"
```

---

## Task 10: Showcase 데모 섹션

**Files:**
- Create: `src/app/showcase/_behavior/BehaviorShowcase.tsx`
- Modify: `src/app/showcase/page.tsx`

- [ ] **Step 1: BehaviorShowcase.tsx 작성 (client 데모)**

```tsx
"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { notify } from "@/lib/notify";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-sm">
      <span className={cn(typo.captionStrong, "text-muted")}>{label}</span>
      <div className="flex flex-wrap items-center gap-base">{children}</div>
    </div>
  );
}

export function BehaviorShowcase() {
  return (
    <section className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-baseline gap-base">
        <h2 className={cn(typo.titleLg, "text-ink")}>동작 컴포넌트</h2>
        <span className={cn(typo.caption, "text-muted")}>
          shadcn 재스킨 — Dialog · Sheet · Toast · Popover · Dropdown · Select · Tabs
        </span>
      </div>

      <div className="flex flex-col gap-lg rounded-xl border border-hairline p-xl">
        <Row label="Toast (notify seam)">
          <Button variant="primary" onClick={() => notify.success("저장되었습니다")}>
            성공 토스트
          </Button>
          <Button
            variant="secondary"
            onClick={() => notify.error("저장에 실패했습니다")}
          >
            오류 토스트
          </Button>
        </Row>

        <Row label="Dialog (Modal)">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="primary">모달 열기</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>다시 편집하시겠어요?</DialogTitle>
                <DialogDescription>
                  다른 사용자가 먼저 수정했습니다. 최신 내용을 불러온 뒤 다시 편집합니다.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">취소</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="primary">다시 편집</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Row>

        <Row label="Sheet (모바일 네비)">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary">
                <Menu size={18} aria-hidden /> 메뉴
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetTitle>메뉴</SheetTitle>
              <SheetDescription>교회 소개 · 예배 · 설교 · 소식</SheetDescription>
            </SheetContent>
          </Sheet>
        </Row>

        <Row label="Popover">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="tertiary">+2 더보기</Button>
            </PopoverTrigger>
            <PopoverContent>
              <p className={cn(typo.bodySm, "text-body")}>
                같은 날 일정 2건이 더 있습니다.
              </p>
            </PopoverContent>
          </Popover>
        </Row>

        <Row label="DropdownMenu">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">교육부서</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>부서</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>유년부</DropdownMenuItem>
              <DropdownMenuItem>중고등부</DropdownMenuItem>
              <DropdownMenuItem>청년부</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Row>

        <Row label="Select">
          <Select>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="예배 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sun1">주일 1부</SelectItem>
              <SelectItem value="sun2">주일 2부</SelectItem>
              <SelectItem value="wed">수요 예배</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        <Row label="Tabs">
          <Tabs defaultValue="intro" className="w-full">
            <TabsList>
              <TabsTrigger value="intro">소개</TabsTrigger>
              <TabsTrigger value="worship">예배</TabsTrigger>
              <TabsTrigger value="location">오시는 길</TabsTrigger>
            </TabsList>
            <TabsContent value="intro">
              <p className={cn(typo.bodyMd, "text-body")}>교회 소개 내용</p>
            </TabsContent>
            <TabsContent value="worship">
              <p className={cn(typo.bodyMd, "text-body")}>예배 안내 내용</p>
            </TabsContent>
            <TabsContent value="location">
              <p className={cn(typo.bodyMd, "text-body")}>오시는 길 내용</p>
            </TabsContent>
          </Tabs>
        </Row>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: page.tsx에 데모 섹션 추가**

`src/app/showcase/page.tsx`의 import 블록에 추가(`cn`/`typo` import 다음 줄):

```tsx
import { BehaviorShowcase } from "./_behavior/BehaviorShowcase";
```

`</main>` 닫기 **직전**(마지막 "변경 없음" `</section>` 다음)에 추가:

```tsx
      <BehaviorShowcase />
```

- [ ] **Step 3: 빌드 검증**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: PASS. showcase는 `NODE_ENV==="production"`에서 404이므로 빌드는 통과하되 라우트는 dev에서만 렌더.

- [ ] **Step 4: Commit**

```bash
git add src/app/showcase/_behavior/BehaviorShowcase.tsx src/app/showcase/page.tsx
git commit -m "feat: showcase에 동작 컴포넌트 데모 섹션 추가"
```

---

## Task 11: 검증 (15.4 게이트)

**Files:**
- 없음(검증 전용). 문제 발견 시 해당 Task 파일 수정 후 재검증.

- [ ] **Step 1: dev 서버 + MCP 브라우저로 데모 진입**

Run(백그라운드): `pnpm dev`
이후 MCP Playwright로 `http://localhost:3000/showcase` 진입, "동작 컴포넌트" 섹션까지 스크롤. 콘솔 에러 0 확인.

- [ ] **Step 2: Modal 접근성 점검 (15.4)**

브라우저에서:
- "모달 열기" 클릭 → 모달 표시.
- Tab을 반복 → 포커스가 모달 내부(취소/다시 편집/닫기)만 순환하고 **밖으로 나가지 않음**.
- 열린 동안 `document.body`의 스크롤 잠금 확인 — `browser_evaluate`로
  `getComputedStyle(document.body).overflow` 또는 `document.body.style.pointerEvents`/`overflow`가 잠김 상태인지(Radix는 `data-scroll-locked`/overflow hidden 부여) 확인.
- `Escape` → 닫힘 + 포커스가 **트리거("모달 열기")로 복귀**.
- 오버레이 클릭 → 닫힘.

Expected: 위 4개 모두 충족(스타일 재스킨 후에도).

- [ ] **Step 3: Toast 자동 가능 범위 점검**

- "성공 토스트" 클릭 → 토스트 표시.
- `browser_evaluate`로 sonner live-region 존재 확인:
  `document.querySelector('[aria-live]') !== null` (sonner는 visually-hidden `aria-live` region을 렌더).
- 토스트 DOM에 메시지 텍스트 삽입 확인, 약 4초 후 자동 제거 확인(`browser_wait_for` 또는 폴링).

Expected: live-region 존재 + 텍스트 삽입 + 4초 후 제거. **실제 SR 낭독은 Step 7 수동.**

- [ ] **Step 4: 잔재 스캔 (zinc·기본 radius 없음)**

각 컴포넌트(Dialog content, Popover, Select content, Dropdown, Sheet)를 연 상태에서 `browser_evaluate`로 대표 요소의 computed style을 덤프:
```js
const el = document.querySelector('[role="dialog"]');
const s = getComputedStyle(el);
({ bg: s.backgroundColor, radius: s.borderRadius, border: s.borderColor });
```
Expected: 배경=흰색(rgb(255,255,255)), radius=24px(rounded-xl), 보더=hairline(rgb(222,225,230)). zinc 계열(rgb(24,24,27) 등)·기본 radius(6/8px shadcn 기본)·`--background` 흔적 없음.

- [ ] **Step 5: 레이어(z-index) 점검**

`browser_evaluate`로 토큰 해석값 확인:
```js
const r = getComputedStyle(document.documentElement);
[r.getPropertyValue('--z-nav'), r.getPropertyValue('--z-popover'), r.getPropertyValue('--z-overlay'), r.getPropertyValue('--z-toast')];
```
Expected: `["10","40","50","60"]`. 그리고 열린 Dialog content의 `getComputedStyle(el).zIndex === "50"`, Popover content === "40".

> 참고: 고정 네비(`top-nav-transparent`)는 T07에서 구현되므로 "네비 위 렌더"의 시각 통합 확인은 T07에서 최종 검증. T04에서는 z 토큰 해석값·portal z 적용까지 보장한다.

- [ ] **Step 6: allowlist + 정적 게이트**

Run:
```bash
ls src/components/ui/
pnpm exec tsc --noEmit && pnpm lint && pnpm build
```
Expected:
- `ui/`에 lowercase shadcn 도입분은 `dialog.tsx sheet.tsx popover.tsx dropdown-menu.tsx select.tsx tabs.tsx sonner.tsx`만(+ T03 PascalCase `Button/Card/Badge/Input`). 목록 외 shadcn 컴포넌트 없음.
- tsc·lint·build 모두 PASS.

- [ ] **Step 7: VoiceOver 수동 스모크 (자동화 불가 영역)**

macOS VoiceOver(⌘F5) 켜고 "성공 토스트" 클릭 → 새 토스트 문구가 **낭독**되는지 1회 확인. (자동 테스트로 단정하지 않는 항목.)

- [ ] **Step 8: 검증 종료 + dev 서버 정리**

`pnpm dev` 백그라운드 종료. 발견된 문제는 해당 Task로 돌아가 수정 후 재검증.

---

## Self-Review (작성자 점검 결과)

**1. 스펙 커버리지** — 스펙 각 절 대응:
- §2.1 토큰 직결 / §2.2 자체 키프레임 → Task 2~9 전반.
- §3.1 수동 벤더링 → Task 3~9(소스 직접 작성=벤더링+재스킨), `init` 미사용.
- §3.3 의존성/15.1 갱신 → Task 1 Step 2, Task 2 Step 4.
- §4 공통 토큰 / §4.1 z-index → Task 2 + 각 컴포넌트 `z-*` 적용.
- §5.1 Dialog(Title 보존·Description·describedby) → Task 3.
- §5.2 Sheet → Task 4.
- §5.3 Toast/notify(client 경계) → Task 5.
- §5.4 Popover/Dropdown/Select/Tabs → Task 6~9.
- §6 애니메이션(in/out·slide·reduced-motion) → Task 2.
- §7 검증(MCP·SR 분리·allowlist·정적) → Task 11.
- §10 완료 조건 → Task 11 Step 2~7로 매핑.

**2. 플레이스홀더 스캔** — TBD/TODO/"적절히 처리" 없음. 모든 코드 스텝에 완전한 코드 포함.

**3. 타입 일관성** — `cn`/`typo` import 경로 일치, `forwardRef` + `ElementRef`/`ComponentPropsWithoutRef` 패턴 전 컴포넌트 동일, z 유틸명(`z-overlay`/`z-popover`/`z-toast`)·animate 토큰명이 Task 2 정의와 사용처 일치. Sheet `side` 타입 `"right"|"left"`가 `sheetSide` 레코드 키와 일치.

**알려진 미세 리스크(실행 중 tsc가 포착):**
- lucide 아이콘 명(`CircleCheck`/`CircleAlert`) 버전 차이 → Task 5 주석의 대체명으로 교체.
- Task 1 Step 1에서 이 Next의 client/layout 규약이 일반과 다르면 layout 마운트 방식 조정.
