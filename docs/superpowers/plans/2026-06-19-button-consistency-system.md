# 버튼 일관성 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 코드베이스 전반의 액션 버튼(추가·수정·삭제·저장·취소)을 의미(semantics) 기준의 단일 규칙으로 통일한다.

**Architecture:** `Button`을 `iconOnly`로 최소 확장하고 액션 라벨·아이콘을 `actionButton.ts` 상수로 중앙화한다. 모든 도메인 버튼을 5개 공통 변환 레시피(R1~R5)에 따라 규칙표에 맞춘다. 변환은 시각·속성 중심이므로 기존 `*.test.tsx`를 게이트로 유지하고 라벨 변경분만 갱신한다.

**Tech Stack:** Next.js(App Router) · TypeScript · Tailwind v4(토큰) · lucide-react · Radix Dialog · vitest + @testing-library/react · pnpm

**Spec:** `docs/superpowers/specs/2026-06-19-button-consistency-system-design.md`

## Global Constraints

- 패키지 매니저는 **pnpm**. 빌드 `pnpm build`, 린트 `pnpm lint`, 테스트 `pnpm test`.
- 아이콘은 **`lucide-react`만**, 크기는 `size` prop, 색은 `currentColor`(토큰 상속).
- **hex·px 인라인 금지** — 색·간격은 토큰 유틸(`bg-primary`·`gap-xs`). arbitrary value 금지(레이아웃 `vh`만 기존 선례 예외).
- 텍스트 스타일은 **`typo.*` 상수**(`@/constants/typography`).
- **JSX 조건부 렌더링은 삼항** `{cond ? <X/> : null}` — `{cond && <X/>}` 금지.
- 주석은 **한국어, WHY 중심**, 주변 스타일에 맞춘다.
- **커밋 메시지에 Co-Authored-By 태그 금지.** 커밋 타입: `feat`/`fix`/`refactor`/`docs`.
- 테스트 관례: vitest `globals:false` → `import { describe, it, expect, vi } from "vitest"` 명시. **jest-dom 없음** → `getAttribute`/`textContent`/`toBeDefined`로 단언. `next/navigation`·`@/lib/notify`·`RequirePermission`은 mock(통과)으로 고정.
- 변경 라인은 모두 스펙 §3 규칙표를 따른다. 비대상(스펙 §4.3): `PhotoGrid` 썸네일, `MediaLibrary` 필터 토글, 인라인 텍스트 링크(`AgreementStatus`·`TermsDialog`·`WithdrawDialog` 트리거), 인증/위저드 도메인 카피.

---

## 공통 변환 레시피 (R1~R5)

> 각 Task는 아래 레시피를 적용할 **파일·라인·라벨**만 명시한다. 코드 형태는 여기서 한 번 정의한다(DRY).
> 공통 import: `import { ACTION, CREATE_ICON, createLabel } from "@/constants/actionButton";` (Task 1에서 생성).

### R1 — 행(row) 액션 표준화: 텍스트 버튼 → `tertiary` + 아이콘 + `lg:inline` 텍스트

`DepartmentTree` 패턴을 표준으로 삼는다. `aria-label`은 컨텍스트를 포함(스크린리더 구분), 텍스트는 `lg` 이상에서만 표시(모바일 아이콘-only).

**Before:**
```tsx
<Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>수정</Button>
<Button type="button" variant="secondary" aria-label="주보 삭제" onClick={() => setDelOpen(true)}>삭제</Button>
```
**After:**
```tsx
<Button type="button" variant="tertiary" aria-label="주보 수정" onClick={() => setEditOpen(true)}>
  <ACTION.edit.Icon size={18} aria-hidden />
  <span className="hidden lg:inline">{ACTION.edit.label}</span>
</Button>
<Button type="button" variant="tertiary" aria-label="주보 삭제" onClick={() => setDelOpen(true)}>
  <ACTION.delete.Icon size={18} aria-hidden />
  <span className="hidden lg:inline">{ACTION.delete.label}</span>
</Button>
```

### R2 — 폼 다이얼로그 취소 추가: `[저장]` → `[취소, 저장]`

`DialogClose`를 import에 추가하고 `DialogFooter` 첫 자식으로 취소(`tertiary`)를 둔다. `DialogClose asChild`라 `type="button"`으로 submit을 막고, 입력 초기화는 기존 `onOpenChange`/effect가 처리한다.

**Before:**
```tsx
<DialogFooter>
  <Button type="submit" variant="primary" loading={mutation.isPending}>저장</Button>
</DialogFooter>
```
**After:**
```tsx
<DialogFooter>
  <DialogClose asChild>
    <Button type="button" variant="tertiary">{ACTION.cancel.label}</Button>
  </DialogClose>
  <Button type="submit" variant="primary" loading={mutation.isPending}>{ACTION.save.label}</Button>
</DialogFooter>
```
> 인라인 폼(다이얼로그 아님, 예: `SermonForm`)은 `DialogClose` 대신 기존 취소 핸들러를 유지하되 **순서만 `[취소, 저장]`** 으로 바꾸고 취소 variant를 `tertiary`로 맞춘다.

### R3 — 생성 버튼 아이콘: `새 X` → `Plus` + 텍스트

toolbar/page-header이므로 텍스트는 항상 표시(모바일 숨김 안 함).

**Before:** `<Button type="button" variant="primary" onClick={() => setOpen(true)}>새 주보</Button>`
**After:**
```tsx
<Button type="button" variant="primary" onClick={() => setOpen(true)}>
  <CREATE_ICON size={18} aria-hidden />
  새 주보
</Button>
```

### R4 — iconOnly 흡수: raw `<button>`(아이콘) → `Button` `iconOnly`

위치·배경 `className`은 유지(오버레이 등), 동작·focus 링은 Button이 제공. `disabled`·`aria-label`·`onClick` 등 prop은 그대로 이동.

**Before:**
```tsx
<button type="button" aria-label="이전 사진" onClick={() => go(-1)} disabled={!hasPrev}
  className="absolute left-xs top-1/2 -translate-y-1/2 rounded-full bg-surface-card/80 p-xs text-ink disabled:opacity-30">
  <ChevronLeft size={24} aria-hidden />
</button>
```
**After:**
```tsx
<Button type="button" variant="tertiary" iconOnly aria-label="이전 사진" onClick={() => go(-1)} disabled={!hasPrev}
  className="absolute left-xs top-1/2 -translate-y-1/2 rounded-full bg-surface-card/80 p-xs text-ink disabled:opacity-30">
  <ChevronLeft size={24} aria-hidden />
</Button>
```

### R5 — 링크 흡수: raw `<a>`(액션 링크) → `buttonVariants()` className

`import { buttonVariants } from "@/components/ui/Button";` 추가. 링크 의미(`href`/`target`)는 유지.

**Before:** `<a href={url} target="_blank" className="...">열기</a>`
**After:** `<a href={url} target="_blank" className={buttonVariants("tertiary")}>열기</a>`

---

## Task 1: 기반 — `Button` `iconOnly` + `actionButton.ts` 상수

**Files:**
- Modify: `src/components/ui/Button.tsx`
- Create: `src/constants/actionButton.ts`
- Test: `src/components/ui/Button.test.tsx` (없으면 생성), `src/constants/actionButton.test.ts`

**Interfaces:**
- Produces: `Button`에 `iconOnly?: boolean` prop. `ACTION` 객체(`edit`/`delete`/`save`/`cancel`), `CREATE_ICON`, `createLabel(entity)` from `@/constants/actionButton`.

- [ ] **Step 1: `actionButton.ts` 실패 테스트 작성**

```ts
// src/constants/actionButton.test.ts
import { describe, it, expect } from "vitest";
import { ACTION, CREATE_ICON, createLabel } from "./actionButton";

describe("actionButton", () => {
  it("핵심 액션 라벨이 고정돼 있다", () => {
    expect(ACTION.edit.label).toBe("수정");
    expect(ACTION.delete.label).toBe("삭제");
    expect(ACTION.save.label).toBe("저장");
    expect(ACTION.cancel.label).toBe("취소");
  });
  it("아이콘 컴포넌트를 노출한다", () => {
    expect(typeof ACTION.edit.Icon).toBe("object"); // lucide forwardRef
    expect(CREATE_ICON).toBeDefined();
  });
  it("생성 라벨을 엔티티로 조합한다", () => {
    expect(createLabel("역할")).toBe("새 역할");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/constants/actionButton.test.ts`
Expected: FAIL — `actionButton` 모듈 없음.

- [ ] **Step 3: `actionButton.ts` 구현**

```ts
// src/constants/actionButton.ts
// 액션 버튼의 라벨·아이콘 단일 정의(버튼 일관성 스펙 §4.4). 호출부는 여기서 가져와 흔들림을 막는다.
import { Plus, Pencil, Trash2 } from "lucide-react";

export const ACTION = {
  edit: { label: "수정", Icon: Pencil },
  delete: { label: "삭제", Icon: Trash2 },
  save: { label: "저장" },
  cancel: { label: "취소" },
} as const;

// 생성 라벨은 엔티티명이 들어가 동적 → 헬퍼로 조합. 아이콘은 Plus 공유.
export const CREATE_ICON = Plus;
export const createLabel = (entity: string) => `새 ${entity}`;
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/constants/actionButton.test.ts`
Expected: PASS.

- [ ] **Step 5: `Button` `iconOnly` 실패 테스트 작성**

```tsx
// src/components/ui/Button.test.tsx (없으면 생성)
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Button } from "./Button";

describe("Button iconOnly", () => {
  it("iconOnly면 정사각 사이즈 클래스를 적용한다", () => {
    const { getByRole } = render(<Button iconOnly aria-label="닫기">x</Button>);
    const cls = getByRole("button").getAttribute("class") ?? "";
    expect(cls.includes("size-9")).toBe(true);
  });
  it("기본(텍스트) 버튼엔 정사각 클래스가 없다", () => {
    const { getByRole } = render(<Button>저장</Button>);
    const cls = getByRole("button").getAttribute("class") ?? "";
    expect(cls.includes("size-9")).toBe(false);
  });
});
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `pnpm test src/components/ui/Button.test.tsx`
Expected: FAIL — `size-9` 없음.

- [ ] **Step 7: `Button`에 `iconOnly` 추가**

`ButtonProps`에 prop 추가하고 render의 className 조합을 수정한다(twMerge가 variant의 `px-5`/`h-12`를 `size-9 p-0`으로 덮는다).

```tsx
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** 진행 중 표시 — 스피너를 띄우고 비활성화한다(이중 제출 방지). */
  loading?: boolean;
  /** 아이콘 단독 버튼 — 정사각 형태. aria-label 필수(스크린리더). */
  iconOnly?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", loading = false, iconOnly = false, disabled, className, children, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      className={cn(buttonVariants(variant), iconOnly ? "size-9 p-0" : null, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `pnpm test src/components/ui/Button.test.tsx src/constants/actionButton.test.ts`
Expected: PASS.

- [ ] **Step 9: 커밋**

```bash
git add src/components/ui/Button.tsx src/components/ui/Button.test.tsx src/constants/actionButton.ts src/constants/actionButton.test.ts
git commit -m "feat : Button iconOnly 확장·액션 메타 상수 추가

버튼 일관성 시스템의 기반 — iconOnly 정사각 버튼 + ACTION 라벨/아이콘 SSOT."
```

---

## Task 2: `DeleteConfirmDialog` 취소 추가 (공용 파괴 확인)

**Files:**
- Modify: `src/components/admin/DeleteConfirmDialog.tsx`
- Modify: `src/components/admin/roles/DeleteConfirmDialog.tsx` (roles 전용 사본 — 동일 변환)
- Test: `src/components/admin/DeleteConfirmDialog.test.tsx`(있으면 갱신, 없으면 생성)

**Interfaces:**
- Consumes: `ACTION.cancel` (Task 1).
- Produces: 모든 파괴 확인 다이얼로그 푸터가 `[취소(tertiary), {confirmLabel}(destructive)]`.

- [ ] **Step 1: 실패 테스트 작성 — 취소 버튼 존재**

```tsx
// src/components/admin/DeleteConfirmDialog.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

describe("DeleteConfirmDialog", () => {
  it("취소와 확정 버튼을 함께 노출한다", () => {
    render(<DeleteConfirmDialog open onOpenChange={vi.fn()} title="삭제할까요?" onConfirm={vi.fn()} />);
    expect(screen.getByRole("button", { name: "취소" })).toBeDefined();
    expect(screen.getByRole("button", { name: "삭제" })).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/components/admin/DeleteConfirmDialog.test.tsx`
Expected: FAIL — "취소" 버튼 없음.

- [ ] **Step 3: `DialogClose` import 추가 + 푸터에 취소 삽입**

`src/components/admin/DeleteConfirmDialog.tsx`의 dialog import 블록에 `DialogClose`를 추가하고, 상단에 `import { ACTION } from "@/constants/actionButton";`. 푸터를 교체:

```tsx
<DialogFooter>
  <DialogClose asChild>
    <Button type="button" variant="tertiary">{ACTION.cancel.label}</Button>
  </DialogClose>
  <Button
    type="button"
    variant="destructive"
    loading={pending}
    disabled={!canConfirm}
    onClick={() => onConfirm(requirePassword ? { password } : undefined)}
  >
    {confirmLabel}
  </Button>
</DialogFooter>
```

- [ ] **Step 4: roles 전용 사본에 동일 변환 적용**

`src/components/admin/roles/DeleteConfirmDialog.tsx`를 열어 동일하게 `DialogClose` import + 푸터에 `[취소, {confirmLabel}]` 적용(코드는 Step 3과 동일 형태).

- [ ] **Step 5: 테스트 통과 + 기존 삭제 테스트 회귀 확인**

Run: `pnpm test src/components/admin/DeleteConfirmDialog.test.tsx src/components/bulletins/BulletinAdminActions.test.tsx`
Expected: PASS — 기존 "삭제" 확정 테스트도 통과(취소는 name "취소"로 구분되어 충돌 없음).

- [ ] **Step 6: 커밋**

```bash
git add src/components/admin/DeleteConfirmDialog.tsx src/components/admin/roles/DeleteConfirmDialog.tsx src/components/admin/DeleteConfirmDialog.test.tsx
git commit -m "feat : 파괴 확인 다이얼로그에 취소 버튼 추가

DialogFooter를 [취소(tertiary), 삭제(destructive)]로 통일."
```

---

## Task 3: 어드민 관리 — roles·positions·tags

**Files:**
- Modify: `src/components/admin/roles/RoleManager.tsx`, `roles/RoleFormDialog.tsx`, `roles/RolePermissionsDialog.tsx`
- Modify: `src/components/admin/positions/PositionManager.tsx`, `positions/PositionFormDialog.tsx`
- Modify: `src/components/admin/tags/TagManager.tsx`, `tags/TagFormDialog.tsx`
- Test: 각 `*Manager.test.tsx`(있으면 갱신)

**Interfaces:**
- Consumes: `ACTION`, `CREATE_ICON`, `createLabel` (Task 1); R2 취소 패턴 (Task 2).

- [ ] **Step 1: 생성 버튼 라벨·아이콘 (R3 + 라벨 통일)**

- `RoleManager.tsx:62` — `역할 추가` → `createLabel("역할")`(="새 역할") + `CREATE_ICON`. 즉:
```tsx
<Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
  <CREATE_ICON size={18} aria-hidden />
  {createLabel("역할")}
</Button>
```
- `PositionManager.tsx:53` — `새 직분`에 `CREATE_ICON` leading 추가(라벨 유지).
- `TagManager.tsx:47` — `새 태그`에 `CREATE_ICON` leading 추가(라벨 유지).

- [ ] **Step 2: 행 액션 표준화 (R1) — `actionCls` 제거, 아이콘 추가**

- `RoleManager.tsx:75-80` — `const actionCls` 라인 삭제. 수정/권한/삭제 3버튼을 아이콘+텍스트로. `disabled`·`title`·`aria-label`은 유지:
```tsx
<div className="flex justify-end gap-xs">
  <Button type="button" variant="tertiary" disabled={!editable} title={editable ? undefined : reason} aria-label={`${r.name} 수정`} onClick={() => setEditTarget(r)}>
    <ACTION.edit.Icon size={18} aria-hidden />
    <span className="hidden lg:inline">{ACTION.edit.label}</span>
  </Button>
  <Button type="button" variant="tertiary" disabled={!editable} title={editable ? undefined : reason} aria-label={`${r.name} 권한`} onClick={() => setPermTarget(r)}>
    <KeyRound size={18} aria-hidden />
    <span className="hidden lg:inline">권한</span>
  </Button>
  <Button type="button" variant="tertiary" disabled={!editable} title={editable ? undefined : reason} aria-label={`${r.name} 삭제`} onClick={() => setDeleteTarget(r)}>
    <ACTION.delete.Icon size={18} aria-hidden />
    <span className="hidden lg:inline">{ACTION.delete.label}</span>
  </Button>
</div>
```
`import { KeyRound } from "lucide-react";` 추가('권한'은 규칙표 밖 toggle — KeyRound로 자명성 부여).
- `PositionManager.tsx:64,65` — 수정/삭제에 R1 적용, `aria-label={`${...} 수정/삭제`}` 부여.
- `TagManager.tsx:58,59` — 동일.

- [ ] **Step 3: 폼 다이얼로그 취소 추가 (R2)**

`RoleFormDialog.tsx`·`RolePermissionsDialog.tsx`·`PositionFormDialog.tsx`·`TagFormDialog.tsx`의 `DialogFooter`에 R2 적용(`DialogClose` import + `[취소, 저장]`).

- [ ] **Step 4: 관련 테스트 실행·갱신**

Run: `pnpm test src/components/admin/roles src/components/admin/positions src/components/admin/tags`
Expected: PASS. 깨지면 — 행 액션을 `getByText("수정")`로 찾던 테스트는 `getByRole("button", { name: /수정/ })`로 갱신(아이콘+`lg:inline` 텍스트 구조 대응). 생성 버튼을 `getByText("역할 추가")`로 찾던 테스트는 `"새 역할"`로 갱신.

- [ ] **Step 5: 빌드·린트**

Run: `pnpm lint && pnpm build`
Expected: 그린.

- [ ] **Step 6: 커밋**

```bash
git add src/components/admin/roles src/components/admin/positions src/components/admin/tags
git commit -m "refactor : 어드민 관리(역할·직분·태그) 버튼 규칙 통일

생성=Plus+'새 X'(역할 추가→새 역할), 행 수정/삭제=tertiary+아이콘,
폼 다이얼로그 [취소,저장], actionCls 제거."
```

---

## Task 4: 어드민 — departments·members·media

**Files:**
- Modify: `src/components/admin/departments/DepartmentTree.tsx`(chevron만), `departments/DepartmentFormDialog.tsx`(순서 확인)
- Modify: `src/components/admin/members/MemberRolesSection.tsx`, `members/MemberProfileForm.tsx`, `members/ResetPasswordSection.tsx`
- Modify: `src/components/admin/media/MediaLibrary.tsx`
- Test: 해당 `*.test.tsx`

**Interfaces:**
- Consumes: `Button` `iconOnly` (Task 1), `buttonVariants` (기존), `ACTION` (Task 1).

- [ ] **Step 1: `DepartmentTree.tsx:69` chevron → iconOnly (R4)**

raw `<button>`(펼치기/접기)을 `Button` `iconOnly variant="tertiary"`로. 기존 `className="text-muted hover:text-ink"` 유지, `aria-label`·`aria-expanded`·`onClick` 그대로:
```tsx
<Button type="button" variant="tertiary" iconOnly onClick={() => onToggle(node.id)}
  aria-label={isCollapsed ? `${node.name} 펼치기` : `${node.name} 접기`} aria-expanded={!isCollapsed}
  className="text-muted hover:text-ink">
  {isCollapsed ? <ChevronRight size={18} aria-hidden /> : <ChevronDown size={18} aria-hidden />}
</Button>
```
(행 액션 `하위/수정/삭제`는 이미 표준 — 변경 없음.)

- [ ] **Step 2: `MemberRolesSection.tsx:79` 회수 → iconOnly (R4), 라벨 유지**

raw `<button>`(역할 회수)을 `Button iconOnly variant="tertiary"`로. **라벨 '회수'·X 아이콘 유지**(연결해제, 삭제 아님). 기존 `disabled`·`title`·`aria-label={`${name} 회수`}`·className 유지:
```tsx
<Button type="button" variant="tertiary" iconOnly aria-label={`${name} 회수`} disabled={!removable}
  title={removable ? undefined : "회수할 수 없는 역할입니다"}
  onClick={() => { if (role) revoke.mutate(role.id); }}
  className="text-muted hover:text-ink disabled:opacity-40">
  <X size={14} aria-hidden />
</Button>
```
(`부여` secondary 버튼은 유지 — 행 밖 보조.)

- [ ] **Step 3: `MemberProfileForm.tsx` 수정 아이콘 + 푸터 순서**

- `:50` 수정(tertiary) → `ACTION.edit.Icon`+`lg:inline` 텍스트(R1, card 위치).
- `:80,81` 푸터를 `[취소, 저장]` 순서로, 취소 variant `secondary`→`tertiary`.

- [ ] **Step 4: `ResetPasswordSection.tsx:45` 취소 variant 정렬**

다이얼로그 취소 `secondary`→`tertiary`. (`:36` 복사 iconOnly·Copy, `:44` 초기화 destructive, `:49` 트리거 secondary는 유지.)

- [ ] **Step 5: `MediaLibrary.tsx` 열기·삭제**

- `:139` `열기` raw `<a>` → `className={buttonVariants("tertiary")}` (R5). `buttonVariants` import 추가.
- `:143` `삭제` secondary → R1(tertiary + `ACTION.delete.Icon` + `lg:inline`), `aria-label` 부여.
- (`:101-103` 필터 토글은 비대상 — 유지.)

- [ ] **Step 6: 테스트·빌드·린트**

Run: `pnpm test src/components/admin/departments src/components/admin/members src/components/admin/media && pnpm lint && pnpm build`
Expected: PASS/그린. 라벨·구조 변경분 테스트 갱신(`getByRole` name 기반).

- [ ] **Step 7: 커밋**

```bash
git add src/components/admin/departments src/components/admin/members src/components/admin/media
git commit -m "refactor : 어드민(부서·회원·미디어) 버튼 규칙 통일

chevron·회수 iconOnly 흡수(회수 라벨 유지=연결해제), 미디어 열기 buttonVariants,
삭제 tertiary+아이콘, 푸터 [취소,저장]."
```

---

## Task 5: 콘텐츠 — bulletins·sermons·notices·events

**Files:**
- Modify: `src/components/bulletins/BulletinAdminActions.tsx`, `bulletins/BulletinFormDialog.tsx`
- Modify: `src/components/sermons/SermonAdminActions.tsx`, `sermons/SermonForm.tsx`, `sermons/SermonVideo.tsx`, `sermons/SermonAudio.tsx`
- Modify: `src/components/notices/NoticeAdminActions.tsx`, `notices/NoticeForm.tsx`
- Modify: `src/components/events/EventAdminActions.tsx`, `events/EventFormDialog.tsx`
- Test: `bulletins/BulletinAdminActions.test.tsx` 등 존재 파일

**Interfaces:**
- Consumes: `ACTION`, `CREATE_ICON` (Task 1); R1/R2/R3/R5.

- [ ] **Step 1: 4개 `*AdminActions` 동일 변환 (R3 + R1)**

각 파일의 toolbar 생성 버튼에 `CREATE_ICON` leading 추가(라벨 유지: `새 주보`/`새 설교`/`새 공지`/`새 일정`). 각 행 액션(수정/삭제)에 R1 적용 + `aria-label` 부여:
- `BulletinAdminActions.tsx:21,45,46` (`주보 수정`/`주보 삭제`)
- `SermonAdminActions.tsx:21,45,46` (`설교 수정`/`설교 삭제`)
- `NoticeAdminActions.tsx:21,63,64` (`공지 수정`/`공지 삭제`)
- `EventAdminActions.tsx:23,55,58` (`일정 수정`/`일정 삭제`)

> 라벨 본문은 `ACTION.edit.label`/`ACTION.delete.label`, aria-label은 위 컨텍스트 문자열.

- [ ] **Step 2: 폼 취소·순서 (R2)**

- `BulletinFormDialog.tsx:114`·`EventFormDialog.tsx`(순서 OK, 취소 variant만 `tertiary` 확인) — 다이얼로그는 R2.
- `SermonForm.tsx:143,144`·`NoticeForm.tsx:126,127` — 인라인 폼: 순서 `[취소, 저장]`, 취소 `secondary`→`tertiary`(R2 인라인 변형, 기존 `router.back()` 핸들러 유지).

- [ ] **Step 3: 미디어 링크 (R5)**

`SermonVideo.tsx:28`·`SermonAudio.tsx:23`의 `영상 보기`/`오디오 듣기` raw `<a>` → `className={buttonVariants("secondary")}`(카드 CTA). `buttonVariants` import 추가.

- [ ] **Step 4: 테스트·빌드·린트**

Run: `pnpm test src/components/bulletins src/components/sermons src/components/notices src/components/events && pnpm lint && pnpm build`
Expected: PASS/그린. `BulletinAdminActions.test.tsx`의 삭제 트리거는 `aria-label="주보 삭제"`로 찾으므로 그대로 통과. 수정 트리거에 새 `aria-label`이 생기니 필요 시 테스트 추가.

- [ ] **Step 5: 커밋**

```bash
git add src/components/bulletins src/components/sermons src/components/notices src/components/events
git commit -m "refactor : 콘텐츠(주보·설교·공지·일정) 버튼 규칙 통일

생성=Plus, 행 수정/삭제 secondary→tertiary+아이콘, 폼 [취소,저장],
미디어 링크 buttonVariants."
```

---

## Task 6: 갤러리

**Files:**
- Modify: `src/components/gallery/GalleryAdminActions.tsx`, `gallery/GalleryPhotoManager.tsx`, `gallery/PhotoLightbox.tsx`, `gallery/AlbumFormDialog.tsx`, `gallery/GalleryGate.tsx`
- Test: 해당 `*.test.tsx`

**Interfaces:**
- Consumes: `Button` `iconOnly`, `buttonVariants`, `ACTION`, `CREATE_ICON`.

- [ ] **Step 1: `GalleryAdminActions.tsx:20,45,46` (R3 + R1)**

`새 앨범`에 `CREATE_ICON`; 행 수정/삭제(secondary)에 R1 + `aria-label`(`앨범 수정`/`앨범 삭제`).

- [ ] **Step 2: `GalleryPhotoManager.tsx:60` 사진 제거 → iconOnly (R4), 라벨 유지**

오버레이 raw `<button>`을 `Button iconOnly variant="tertiary"`로. **`aria-label="사진 제거"`·X 아이콘 유지**(연결해제). 오버레이 className 유지:
```tsx
<Button type="button" variant="tertiary" iconOnly aria-label="사진 제거" onClick={() => setOpen(true)}
  className="absolute right-xs top-xs size-8 rounded-full bg-surface-dark/60 text-on-dark hover:bg-surface-dark/80">
  <X size={16} aria-hidden />
</Button>
```
(`:36` `사진 추가` secondary는 유지 — picker 트리거.)

- [ ] **Step 3: `PhotoLightbox.tsx:59,68` prev/next → iconOnly (R4)**

두 raw `<button>`(이전/다음 사진)을 R4로(코드 형태는 레시피 R4 예시 그대로, 우측은 `ChevronRight`·`right-xs`·`onClick={() => go(1)}`·`disabled={!hasNext}`).

- [ ] **Step 4: `AlbumFormDialog.tsx:88` 폼 취소 (R2)**

`DialogFooter`에 `[취소, 저장]`(R2).

- [ ] **Step 5: `GalleryGate.tsx:34` 로그인 링크 (R5)**

`로그인` raw `<a>` → `<Link>` + `className={buttonVariants("primary")}`(게이트 CTA). `next/link` `Link`·`buttonVariants` import 확인.

- [ ] **Step 6: 테스트·빌드·린트**

Run: `pnpm test src/components/gallery && pnpm lint && pnpm build`
Expected: PASS/그린. 라이트박스/제거 버튼을 `getByRole("button", { name: "이전 사진" })` 등으로 찾는 테스트는 그대로 통과(aria-label 유지).

- [ ] **Step 7: 커밋**

```bash
git add src/components/gallery
git commit -m "refactor : 갤러리 버튼 규칙 통일

생성=Plus, 행 수정/삭제 tertiary+아이콘, 사진 제거·라이트박스 iconOnly 흡수
(제거 라벨 유지=연결해제), 앨범 폼 [취소,저장], 로그인 buttonVariants."
```

---

## Task 7: 마이페이지·인증

**Files:**
- Modify: `src/components/mypage/MypageContent.tsx`, `mypage/ProfileCard.tsx`, `mypage/ProfileEditForm.tsx`, `mypage/PasswordChangeSection.tsx`
- Modify: `src/components/auth/SignupForm.tsx`(규칙 합치만 — 변경 최소)
- Test: 해당 `*.test.tsx`

**Interfaces:**
- Consumes: `ACTION` (Task 1).

- [ ] **Step 1: `MypageContent.tsx` 로그아웃 색 정렬**

- `:76`(에러 카드) 로그아웃 `tertiary`→`secondary`.
- `:93`(정상 화면) 로그아웃 `destructive`→`secondary`. (로그아웃은 파괴 아님 — `destructive` 빨강 제거.)

- [ ] **Step 2: `PasswordChangeSection.tsx:88,89` 라벨·순서**

- `:88` submit `변경` → `{ACTION.save.label}`(="저장"). (`:61` 트리거 `비밀번호 변경` 유지.)
- 인라인 폼 푸터 순서 `[취소, 저장]`으로(취소는 이미 tertiary, `reset();setOpen(false)` 핸들러 유지).

- [ ] **Step 3: `ProfileCard.tsx:41` 수정 아이콘 (R1, card)**

수정(tertiary)에 `ACTION.edit.Icon`+`lg:inline` 텍스트, `aria-label="내 정보 수정"`.

- [ ] **Step 4: `ProfileEditForm.tsx:106,107` 푸터 순서**

`[저장, 취소]` → `[취소, 저장]`(취소 tertiary 유지).

- [ ] **Step 5: `SignupForm.tsx` 규칙 합치**

`다음/가입하기`(primary)·`건너뛰기`·`이전`(tertiary)은 도메인 카피라 라벨 유지, variant가 규칙(primary 제출 / tertiary 보조)과 이미 일치하는지 확인만. 불일치 없으면 변경 없음.

- [ ] **Step 6: 테스트·빌드·린트**

Run: `pnpm test src/components/mypage src/components/auth && pnpm lint && pnpm build`
Expected: PASS/그린. `변경` 라벨로 찾던 테스트는 `저장`으로 갱신.

- [ ] **Step 7: 커밋**

```bash
git add src/components/mypage src/components/auth
git commit -m "refactor : 마이페이지·인증 버튼 규칙 통일

로그아웃 destructive→secondary, 비밀번호 제출 변경→저장,
프로필 수정 아이콘, 폼 [취소,저장]."
```

---

## Task 8: 전역 검증 (Definition of Done)

**Files:** 없음(검증만)

- [ ] **Step 1: 전체 테스트**

Run: `pnpm test`
Expected: 전부 PASS.

- [ ] **Step 2: 린트·빌드**

Run: `pnpm lint && pnpm build`
Expected: 그린.

- [ ] **Step 3: 잔존 raw 버튼 점검 (비대상 제외)**

Run: `grep -rn "<button" src/components --include="*.tsx" | grep -v "DialogTrigger\|PhotoGrid\|test"`
Expected: 비대상(스펙 §4.3)만 남는다 — `PhotoGrid` 썸네일, 인라인 텍스트 링크(DialogTrigger/Link). 그 외 액션 버튼이 남으면 누락.

- [ ] **Step 4: 시각 스폿체크**

`pnpm dev` 후 확인: 어드민 관리(역할/직분/태그) 행 액션 아이콘+텍스트, 콘텐츠/갤러리 행 액션, 다이얼로그 푸터 `[취소, 저장]`, 모바일 폭(`lg` 미만)에서 행 액션 아이콘-only, 로그아웃 색.

- [ ] **Step 5: 보고서(선택)**

필요 시 `/report`로 구현 보고서 생성.

---

## Self-Review 결과

- **Spec 커버리지:** §3 규칙표→R1~R5 + Task 3~7, §4.1 iconOnly→Task 1, §4.4 상수→Task 1, §4.5 푸터→Task 2/R2, §5 매핑→Task 3~7 전부 대응. §4.3 비대상은 Task 8 Step 3에서 검증.
- **Placeholder:** 없음(모든 변경에 before/after 코드 또는 정확한 파일:라인·라벨).
- **Type 일관성:** `ACTION.edit.Icon`/`ACTION.delete.Icon`/`ACTION.save.label`/`ACTION.cancel.label`/`CREATE_ICON`/`createLabel`/`buttonVariants`/`iconOnly` 명칭이 Task 1 정의와 전 Task에서 일치.
