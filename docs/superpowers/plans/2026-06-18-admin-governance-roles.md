# 어드민 07A 역할·권한 관리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영자가 마이페이지 관리 허브에서 역할을 추가·수정·삭제하고 역할별 권한을 일괄 설정하는 화면 1종을 구현한다.

**Architecture:** 기존 어드민 매니저(직분·부서·미디어) 패턴을 그대로 미러링한다 — `DataTable` + 폼 `Dialog` + `useQuery`/`useMutation`/`adminKeys` 무효화. 신규 요소는 권한 체크박스 다이얼로그와 위계 가드(`canManageRole`) 둘뿐이다. 역할은 `version`(낙관락)·단건 GET이 없어 수정·권한 시드는 목록 행 값에서 직접 가져온다.

**Tech Stack:** Next.js(App Router)·TypeScript·TanStack Query v5·react-hook-form·zod v4(4.4.3)·Tailwind(토큰)·vitest + @testing-library/react.

## Global Constraints

- 패키지 매니저는 **pnpm**.
- 테스트는 **vitest**, `globals:false` — `describe/it/expect/vi` 등을 매 파일 명시 import. **jest-dom 없음** → `expect(x).toBeDefined()`·`getAttribute(...)`·`.checked`로 단언(`toBeInTheDocument` 금지).
- 토큰만 사용 — hex·px 인라인 금지, 텍스트는 `typo.*`, 아이콘은 `lucide-react`(`currentColor`·`size`), JSX 조건부는 **삼항**(`{cond ? <X/> : null}`).
- **어드민 응답 타입은 도메인-로컬** — `RoleResponse`·`PermissionResponse`는 `src/lib/api/types.ts`(공개 GET 응답 전용)가 아니라 각 admin 모듈에 둔다(`media.admin.ts` 선례). 요청 타입도 도메인-로컬.
- **effect 내 `setState` 금지(eslint 에러)** — 폼 시드는 RHF `reset()`(setState 아님)으로, 권한 선택 Set 시드는 **keyed 마운트 + `useState` 초기화**로 처리(effect 미사용).
- **zod v4(4.4.3)**: `z.number({ invalid_type_error })` 인자 사용 금지(tsc 깨짐) — 메시지 인자 없이 기본 메시지.
- **priority 하한 없음** — 서버 계약은 `정수 ≤ maxPriority`만 제약. `.nonnegative()` 등 하한 추가 금지.
- **커밋**: 사용자 명시 요청 시에만, 기능 단위로 묶어서(메모리 `commit-granularity-feature-grouped`). **태스크 사이 커밋 금지.** 각 태스크는 "테스트 GREEN"에서 끝난다(커밋 스텝 없음).
- **완료 게이트(전체)**: `pnpm test` 전체 통과 · `npx tsc --noEmit` 0 · `pnpm lint` 0. 커버리지 80%+.
- 경로 별칭 `@/` = `src/`.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `src/lib/api/permissions.admin.ts` (생성) | 권한 카탈로그 응답 타입 + `getPermissions` |
| `src/lib/api/roles.admin.ts` (생성) | 역할 응답·요청 타입 + `getRoles`/`createRole`/`patchRole`/`deleteRole`/`setRolePermissions` |
| `src/lib/admin/roleGuards.ts` (생성) | `canManageRole` 위계 판별식(편집·삭제·권한설정 전용, 07B 공유) |
| `src/components/admin/roles/schema.ts` (생성) | `createRoleSchema(maxPriority)` zod 팩토리 |
| `src/components/admin/roles/RoleFormDialog.tsx` (생성) | 역할 생성·수정 Dialog |
| `src/components/admin/roles/RolePermissionsDialog.tsx` (생성) | 권한 체크박스 매트릭스 → 전체 교체 PUT |
| `src/components/admin/roles/RoleManager.tsx` (생성) | 목록·툴바·다이얼로그 오케스트레이터 |
| `src/app/(site)/mypage/manage/roles/page.tsx` (생성) | Container + `RequirePermission("ROLE_MANAGE")` + RoleManager |
| `.claude/rules/DESIGN.md` (수정) | 어드민 공용 블록 07 구획에 컴포넌트 3종 등록 |

**무변경(이미 정합)**: `src/lib/admin/manageDomains.ts`(`roles` 카드 보유, 줄22), `src/constants/permissions.ts`(`ROLE_MANAGE` 라벨 + `permissionLabel()` 헬퍼 보유). 관리 허브 카드는 권한 보유 시 자동 노출.

---

## Task 1: 권한 카탈로그 API

**Files:**
- Create: `src/lib/api/permissions.admin.ts`
- Test: `src/lib/api/permissions.admin.test.ts`

**Interfaces:**
- Consumes: `authFetch`(`@/lib/auth/authFetch`), `parseJson`(`@/lib/auth/apiError`).
- Produces: `interface PermissionResponse { id: number; name: string; description: string }` · `getPermissions(): Promise<PermissionResponse[]>`.

- [ ] **Step 1: 실패 테스트 작성** — `src/lib/api/permissions.admin.test.ts`

```ts
import { describe, it, expect, vi, afterEach } from "vitest";

const { authFetchMock, parseJsonMock } = vi.hoisted(() => ({ authFetchMock: vi.fn(), parseJsonMock: vi.fn() }));
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));
vi.mock("@/lib/auth/apiError", () => ({ parseJson: parseJsonMock }));

import { getPermissions } from "./permissions.admin";

afterEach(() => vi.clearAllMocks());

describe("권한 카탈로그 API", () => {
  it("getPermissions는 GET /api/admin/permissions를 호출하고 파싱 결과를 반환한다", async () => {
    const res = {} as Response;
    authFetchMock.mockResolvedValue(res);
    parseJsonMock.mockResolvedValue([{ id: 1, name: "ROLE_MANAGE", description: "역할·권한 관리" }]);
    const out = await getPermissions();
    expect(authFetchMock).toHaveBeenCalledWith("/api/admin/permissions");
    expect(parseJsonMock).toHaveBeenCalledWith(res);
    expect(out[0].name).toBe("ROLE_MANAGE");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/lib/api/permissions.admin.test.ts`
Expected: FAIL — `getPermissions`/모듈 미존재.

- [ ] **Step 3: 구현** — `src/lib/api/permissions.admin.ts`

```ts
// 어드민 권한 카탈로그 조회. client 컴포넌트 전용(authFetch 체인 → RSC 번들 금지).
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";

// 어드민 응답 타입(공개 GET 없음 → 도메인-로컬, media.admin.ts 선례). OpenAPI PermissionResponse와 일치.
export interface PermissionResponse {
  id: number;
  name: string; // 코드형 키(예: "ROLE_MANAGE")
  description: string; // 서버 한글 설명(보조)
}

export async function getPermissions(): Promise<PermissionResponse[]> {
  const res = await authFetch("/api/admin/permissions");
  return parseJson<PermissionResponse[]>(res);
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/lib/api/permissions.admin.test.ts`
Expected: PASS.

---

## Task 2: 역할 API

**Files:**
- Create: `src/lib/api/roles.admin.ts`
- Test: `src/lib/api/roles.admin.test.ts`

**Interfaces:**
- Consumes: `authFetch`, `parseJson`, `apiMutate`(`@/lib/admin/apiMutate`), `PermissionResponse`(Task 1).
- Produces:
  - `interface RoleResponse { id: number; name: string; priority: number; isSystem: boolean; description: string; permissions: PermissionResponse[] }`
  - `interface RoleCreateRequest { name: string; priority: number; description?: string }`
  - `interface RoleUpdateRequest { name: string; priority: number; description?: string }`
  - `getRoles(): Promise<RoleResponse[]>` · `createRole(body)` · `patchRole(id, body)` · `deleteRole(id): Promise<void>` · `setRolePermissions(id: number, names: string[]): Promise<RoleResponse>`.

- [ ] **Step 1: 실패 테스트 작성** — `src/lib/api/roles.admin.test.ts`

```ts
import { describe, it, expect, vi, afterEach } from "vitest";

const { authFetchMock, parseJsonMock, apiMutateMock } = vi.hoisted(() => ({
  authFetchMock: vi.fn(), parseJsonMock: vi.fn(), apiMutateMock: vi.fn(),
}));
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));
vi.mock("@/lib/auth/apiError", () => ({ parseJson: parseJsonMock }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { getRoles, createRole, patchRole, deleteRole, setRolePermissions } from "./roles.admin";

afterEach(() => vi.clearAllMocks());

describe("역할 어드민 API", () => {
  it("getRoles는 GET /api/admin/roles 파싱 결과를 반환한다", async () => {
    const res = {} as Response;
    authFetchMock.mockResolvedValue(res);
    parseJsonMock.mockResolvedValue([{ id: 1, name: "관리자", priority: 50, isSystem: false, description: "", permissions: [] }]);
    const out = await getRoles();
    expect(authFetchMock).toHaveBeenCalledWith("/api/admin/roles");
    expect(parseJsonMock).toHaveBeenCalledWith(res);
    expect(out[0].name).toBe("관리자");
  });
  it("createRole은 POST로 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 2 });
    await createRole({ name: "교사", priority: 30, description: "주일학교" });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/roles", { method: "POST", body: { name: "교사", priority: 30, description: "주일학교" } });
  });
  it("patchRole은 PATCH로 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 2 });
    await patchRole(2, { name: "교사", priority: 20 });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/roles/2", { method: "PATCH", body: { name: "교사", priority: 20 } });
  });
  it("deleteRole은 DELETE를 호출한다", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteRole(2);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/roles/2", { method: "DELETE" });
  });
  it("setRolePermissions는 PUT으로 {permissions:[names]}를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 2 });
    await setRolePermissions(2, ["SERMON_WRITE", "NOTICE_WRITE"]);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/roles/2/permissions", { method: "PUT", body: { permissions: ["SERMON_WRITE", "NOTICE_WRITE"] } });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/lib/api/roles.admin.test.ts`
Expected: FAIL — 모듈 미존재.

- [ ] **Step 3: 구현** — `src/lib/api/roles.admin.ts`

```ts
// 어드민 역할 읽기·쓰기. client 컴포넌트 전용(authFetch/apiMutate 체인 → RSC 번들 금지).
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import { apiMutate } from "@/lib/admin/apiMutate";
import type { PermissionResponse } from "./permissions.admin";

// 어드민 응답 타입(공개 GET 없음 → 도메인-로컬, media.admin.ts 선례). OpenAPI RoleResponse와 일치.
// version 없음 — 역할은 낙관락·단건 GET 미존재(태그·직분과 동형). 수정·권한 시드는 목록 행 값 사용.
export interface RoleResponse {
  id: number;
  name: string;
  priority: number;
  isSystem: boolean;
  description: string;
  permissions: PermissionResponse[];
}

export interface RoleCreateRequest { name: string; priority: number; description?: string }
// PATCH지만 폼 전체 제출(name·priority 항상 전송). 부분수정 의도 아님.
export interface RoleUpdateRequest { name: string; priority: number; description?: string }

export async function getRoles(): Promise<RoleResponse[]> {
  const res = await authFetch("/api/admin/roles");
  return parseJson<RoleResponse[]>(res); // priority 내림차순 평배열
}
export function createRole(body: RoleCreateRequest): Promise<RoleResponse> {
  return apiMutate<RoleResponse>("/api/admin/roles", { method: "POST", body });
}
export function patchRole(id: number, body: RoleUpdateRequest): Promise<RoleResponse> {
  return apiMutate<RoleResponse>(`/api/admin/roles/${id}`, { method: "PATCH", body });
}
export function deleteRole(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/roles/${id}`, { method: "DELETE" });
}
// 권한 전체 교체(PUT). 권한 '이름' 배열 전송(id 아님), 빈 배열 = 전 권한 회수.
export function setRolePermissions(id: number, names: string[]): Promise<RoleResponse> {
  return apiMutate<RoleResponse>(`/api/admin/roles/${id}/permissions`, { method: "PUT", body: { permissions: names } });
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/lib/api/roles.admin.test.ts`
Expected: PASS.

---

## Task 3: 위계 가드

**Files:**
- Create: `src/lib/admin/roleGuards.ts`
- Test: `src/lib/admin/roleGuards.test.ts`

**Interfaces:**
- Consumes: `type RoleResponse`(Task 2).
- Produces: `canManageRole(role: RoleResponse, maxPriority: number): boolean`.

- [ ] **Step 1: 실패 테스트 작성** — `src/lib/admin/roleGuards.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { canManageRole } from "./roleGuards";
import type { RoleResponse } from "@/lib/api/roles.admin";

const role = (over: Partial<RoleResponse>): RoleResponse => ({ id: 1, name: "R", priority: 10, isSystem: false, description: "", permissions: [], ...over });

describe("canManageRole", () => {
  it("시스템 역할은 false", () => { expect(canManageRole(role({ isSystem: true, priority: 5 }), 100)).toBe(false); });
  it("내 등급 초과는 false", () => { expect(canManageRole(role({ priority: 60 }), 50)).toBe(false); });
  it("같은 등급은 true(같은 레벨 허용)", () => { expect(canManageRole(role({ priority: 50 }), 50)).toBe(true); });
  it("낮은 등급은 true", () => { expect(canManageRole(role({ priority: 10 }), 50)).toBe(true); });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/lib/admin/roleGuards.test.ts`
Expected: FAIL — 모듈 미존재.

- [ ] **Step 3: 구현** — `src/lib/admin/roleGuards.ts`

```ts
import type { RoleResponse } from "@/lib/api/roles.admin";

// 편집·삭제·권한설정 가드: 시스템 역할 아님 && 대상 우선순위 ≤ 내 최대 등급(같은 등급 허용).
// 서버가 동일 조건으로 최종 방어(403) — 이건 버튼 선제 비활성용 UX 가드(가이드 2.1).
// 주의: 회원 '역할 부여/회수'(07B)에는 재사용 금지 — 부여는 isSystem을 막지 않고,
// MEMBER(시스템 역할) 부여가 곧 교인 승인이라 isSystem 제외 시 승인이 막힌다. 07B는 우선순위 단독 판별식을 별도로 둔다.
export function canManageRole(role: RoleResponse, maxPriority: number): boolean {
  return !role.isSystem && role.priority <= maxPriority;
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/lib/admin/roleGuards.test.ts`
Expected: PASS.

---

## Task 4: 역할 폼 스키마

**Files:**
- Create: `src/components/admin/roles/schema.ts`
- Test: `src/components/admin/roles/schema.test.ts`

**Interfaces:**
- Consumes: `zod`.
- Produces: `createRoleSchema(maxPriority: number)` (zod object) · `type RoleFormValues = { name: string; priority: number; description: string }`.

- [ ] **Step 1: 실패 테스트 작성** — `src/components/admin/roles/schema.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { createRoleSchema } from "./schema";

const s = createRoleSchema(50);

describe("createRoleSchema", () => {
  it("정상값 통과", () => { expect(s.safeParse({ name: "교사", priority: 30, description: "" }).success).toBe(true); });
  it("빈 이름 실패", () => { expect(s.safeParse({ name: "", priority: 30, description: "" }).success).toBe(false); });
  it("51자 이름 실패", () => { expect(s.safeParse({ name: "가".repeat(51), priority: 30, description: "" }).success).toBe(false); });
  it("priority 소수 실패", () => { expect(s.safeParse({ name: "교사", priority: 1.5, description: "" }).success).toBe(false); });
  it("priority가 maxPriority 초과면 실패", () => { expect(s.safeParse({ name: "교사", priority: 51, description: "" }).success).toBe(false); });
  it("priority == maxPriority 통과(같은 등급 허용)", () => { expect(s.safeParse({ name: "교사", priority: 50, description: "" }).success).toBe(true); });
  it("priority 음수 통과(하한 없음 — 계약 무제약)", () => { expect(s.safeParse({ name: "교사", priority: -1, description: "" }).success).toBe(true); });
  it("description 256자 실패", () => { expect(s.safeParse({ name: "교사", priority: 30, description: "가".repeat(256) }).success).toBe(false); });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/components/admin/roles/schema.test.ts`
Expected: FAIL — 모듈 미존재.

- [ ] **Step 3: 구현** — `src/components/admin/roles/schema.ts`

```ts
import { z } from "zod";

// priority 상한이 런타임(maxPriority)이라 스키마 팩토리. optional().default() 미사용(zodResolver 입출력 타입 일치).
// zod v4 — number 커스텀 메시지 인자(invalid_type_error) 미사용. 하한 없음(계약 무제약, 음수 maxPriority 폼 불능 방지).
export function createRoleSchema(maxPriority: number) {
  return z.object({
    name: z.string().trim().min(1, "이름을 입력해 주세요.").max(50, "50자 이내로 입력해 주세요."),
    priority: z.number().int().max(maxPriority, "내 등급보다 높게 만들 수 없습니다."),
    description: z.string().trim().max(255, "255자 이내로 입력해 주세요."),
  });
}
export type RoleFormValues = z.infer<ReturnType<typeof createRoleSchema>>;
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/components/admin/roles/schema.test.ts`
Expected: PASS.

---

## Task 5: RoleFormDialog (역할 생성·수정)

**Files:**
- Create: `src/components/admin/roles/RoleFormDialog.tsx`
- Test: `src/components/admin/roles/RoleFormDialog.test.tsx`

**Interfaces:**
- Consumes: `createRole`/`patchRole`/`RoleCreateRequest`/`RoleResponse`(Task 2), `createRoleSchema`/`RoleFormValues`(Task 4), `useMe`(`@/lib/auth/useMe`), `adminOnError`, `adminKeys`, `notify`, `Dialog*`/`Input`/`Button`.
- Produces: `RoleFormDialog({ open, onOpenChange, mode, initial? })`.

- [ ] **Step 1: 실패 테스트 작성** — `src/components/admin/roles/RoleFormDialog.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { createMock, patchMock, notifySuccess } = vi.hoisted(() => ({ createMock: vi.fn(), patchMock: vi.fn(), notifySuccess: vi.fn() }));
vi.mock("@/lib/api/roles.admin", () => ({ createRole: createMock, patchRole: patchMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/lib/auth/useMe", () => ({ useMe: () => ({ data: { maxPriority: 50 } }) }));

import { RoleFormDialog } from "./RoleFormDialog";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
const renderDialog = (ui: React.ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

describe("RoleFormDialog", () => {
  it("등록: name·priority·description을 createRole에 전달", async () => {
    createMock.mockResolvedValue({ id: 1 });
    renderDialog(<RoleFormDialog open mode="create" onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "교사" } });
    fireEvent.change(screen.getByLabelText("우선순위"), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText("설명(선택)"), { target: { value: "주일학교" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createMock).toHaveBeenCalledWith({ name: "교사", priority: 30, description: "주일학교" }));
  });

  it("등록: priority가 내 등급(50) 초과면 차단", async () => {
    renderDialog(<RoleFormDialog open mode="create" onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "상위" } });
    fireEvent.change(screen.getByLabelText("우선순위"), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("내 등급보다 높게 만들 수 없습니다.")).toBeDefined());
    expect(createMock).not.toHaveBeenCalled();
  });

  it("수정: initial 시드 후 patchRole 호출 + ['roles']·['me'] 무효화", async () => {
    patchMock.mockResolvedValue({ id: 5 });
    const spy = vi.spyOn(qc, "invalidateQueries");
    renderDialog(
      <RoleFormDialog open mode="edit" onOpenChange={() => {}}
        initial={{ id: 5, name: "교사", priority: 30, isSystem: false, description: "주일학교", permissions: [] }} />,
    );
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "수석교사" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(patchMock).toHaveBeenCalledWith(5, { name: "수석교사", priority: 30, description: "주일학교" }));
    expect(spy).toHaveBeenCalledWith({ queryKey: ["admin", "roles", "list", undefined] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["me"] });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/components/admin/roles/RoleFormDialog.test.tsx`
Expected: FAIL — 모듈 미존재.

- [ ] **Step 3: 구현** — `src/components/admin/roles/RoleFormDialog.tsx`

```tsx
"use client";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { adminKeys } from "@/lib/admin/queryKeys";
import { notify } from "@/lib/notify";
import { useMe } from "@/lib/auth/useMe";
import { createRole, patchRole, type RoleCreateRequest, type RoleResponse } from "@/lib/api/roles.admin";
import { createRoleSchema, type RoleFormValues } from "./schema";

export interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: RoleResponse;
}

export function RoleFormDialog({ open, onOpenChange, mode, initial }: RoleFormDialogProps) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const maxPriority = me?.maxPriority ?? 0;
  const schema = useMemo(() => createRoleSchema(maxPriority), [maxPriority]);

  const { register, handleSubmit, control, reset, setError, formState: { errors } } = useForm<RoleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: initial?.name ?? "", priority: initial?.priority ?? 0, description: initial?.description ?? "" },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      mode === "edit" && initial
        ? { name: initial.name, priority: initial.priority, description: initial.description }
        : { name: "", priority: 0, description: "" },
    );
  }, [open, mode, initial, reset]);

  const mutation = useMutation({
    mutationFn: (v: RoleFormValues) => {
      const body: RoleCreateRequest = { name: v.name, priority: v.priority, description: v.description };
      return mode === "edit" && initial ? patchRole(initial.id, body) : createRole(body);
    },
    onError: adminOnError({
      onDuplicate: () => setError("name", { message: "같은 이름이 이미 있습니다." }),
      onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof RoleFormValues, { message: fe.reason })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.list("roles") });
      // 자기 보유 역할의 priority/권한이 바뀌면 maxPriority·permissions가 변함 → useMe 게이트 동기화(수정 시).
      if (mode === "edit") qc.invalidateQueries({ queryKey: ["me"] });
      notify.success("저장했습니다.");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "역할 수정" : "역할 등록"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-base">
          <div className="flex flex-col gap-xxs">
            <label htmlFor="role-name" className={cn(typo.bodySm, "text-body")}>이름</label>
            <Input id="role-name" error={errors.name?.message} {...register("name")} />
          </div>
          <div className="flex flex-col gap-xxs">
            <label htmlFor="role-priority" className={cn(typo.bodySm, "text-body")}>우선순위</label>
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <Input
                  id="role-priority"
                  type="number"
                  inputMode="numeric"
                  step={1}
                  value={Number.isNaN(field.value) ? "" : String(field.value)}
                  onChange={(e) => field.onChange(e.target.value === "" ? NaN : Number(e.target.value))}
                  error={errors.priority?.message}
                />
              )}
            />
            <p className={cn(typo.caption, "text-muted")}>내 최대 등급: {maxPriority} (같은 등급까지 만들 수 있습니다)</p>
          </div>
          <div className="flex flex-col gap-xxs">
            <label htmlFor="role-description" className={cn(typo.bodySm, "text-body")}>설명(선택)</label>
            <Input id="role-description" error={errors.description?.message} {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="primary" loading={mutation.isPending}>저장</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/components/admin/roles/RoleFormDialog.test.tsx`
Expected: PASS.

---

## Task 6: RolePermissionsDialog (권한 매트릭스)

**Files:**
- Create: `src/components/admin/roles/RolePermissionsDialog.tsx`
- Test: `src/components/admin/roles/RolePermissionsDialog.test.tsx`

**Interfaces:**
- Consumes: `getPermissions`(Task 1), `setRolePermissions`/`RoleResponse`(Task 2), `permissionLabel`(`@/constants/permissions`), `adminKeys`, `adminOnError`, `notify`, `Dialog*`/`Checkbox`/`Button`.
- Produces: `RolePermissionsDialog({ open, onOpenChange, role })`. **호출 측은 keyed 마운트로 띄운다**(`key={role.id}` + 보유 시에만 렌더) — `useState` 초기화로 시드하므로 effect 미사용.

- [ ] **Step 1: 실패 테스트 작성** — `src/components/admin/roles/RolePermissionsDialog.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getPermsMock, setPermsMock, notifySuccess } = vi.hoisted(() => ({ getPermsMock: vi.fn(), setPermsMock: vi.fn(), notifySuccess: vi.fn() }));
vi.mock("@/lib/api/permissions.admin", () => ({ getPermissions: getPermsMock }));
vi.mock("@/lib/api/roles.admin", () => ({ setRolePermissions: setPermsMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));

import { RolePermissionsDialog } from "./RolePermissionsDialog";
import type { RoleResponse } from "@/lib/api/roles.admin";

const role: RoleResponse = { id: 7, name: "교사", priority: 30, isSystem: false, description: "", permissions: [{ id: 1, name: "SERMON_WRITE", description: "설교 관리" }] };

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  getPermsMock.mockResolvedValue([
    { id: 1, name: "SERMON_WRITE", description: "설교 관리" },
    { id: 2, name: "NOTICE_WRITE", description: "공지 관리" },
  ]);
});
afterEach(() => vi.clearAllMocks());
const renderDialog = () => render(<QueryClientProvider client={qc}><RolePermissionsDialog open role={role} onOpenChange={() => {}} /></QueryClientProvider>);

describe("RolePermissionsDialog", () => {
  it("카탈로그를 렌더하고 역할 보유 권한으로 초기 체크 시드", async () => {
    renderDialog();
    await waitFor(() => expect(screen.getByLabelText("설교 관리")).toBeDefined());
    expect((screen.getByLabelText("설교 관리") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("공지 관리") as HTMLInputElement).checked).toBe(false);
  });

  it("토글 후 저장하면 선택된 권한 이름 배열로 setRolePermissions 호출", async () => {
    setPermsMock.mockResolvedValue({ id: 7 });
    renderDialog();
    await waitFor(() => expect(screen.getByLabelText("공지 관리")).toBeDefined());
    fireEvent.click(screen.getByText("공지 관리"));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(setPermsMock).toHaveBeenCalledWith(7, ["SERMON_WRITE", "NOTICE_WRITE"]));
  });

  it("전체 해제 후 저장하면 빈 배열 PUT", async () => {
    setPermsMock.mockResolvedValue({ id: 7 });
    renderDialog();
    await waitFor(() => expect(screen.getByLabelText("설교 관리")).toBeDefined());
    fireEvent.click(screen.getByText("설교 관리"));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(setPermsMock).toHaveBeenCalledWith(7, []));
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/components/admin/roles/RolePermissionsDialog.test.tsx`
Expected: FAIL — 모듈 미존재.

- [ ] **Step 3: 구현** — `src/components/admin/roles/RolePermissionsDialog.tsx`

```tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { adminKeys } from "@/lib/admin/queryKeys";
import { notify } from "@/lib/notify";
import { permissionLabel } from "@/constants/permissions";
import { getPermissions } from "@/lib/api/permissions.admin";
import { setRolePermissions, type RoleResponse } from "@/lib/api/roles.admin";

export interface RolePermissionsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role: RoleResponse; // 호출 측이 key={role.id}로 마운트 → 초기화로 시드(effect 미사용)
}

export function RolePermissionsDialog({ open, onOpenChange, role }: RolePermissionsDialogProps) {
  const qc = useQueryClient();
  const { data: catalog = [] } = useQuery({
    queryKey: adminKeys.list("permissions"),
    queryFn: getPermissions,
    staleTime: 5 * 60 * 1000, // 카탈로그는 정적
  });

  // 역할의 현재 보유 권한으로 시드. keyed 마운트라 role별로 초기화 1회(set-state-in-effect 회피).
  const [selected, setSelected] = useState<Set<string>>(() => new Set(role.permissions.map((p) => p.name)));

  const toggle = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const mutation = useMutation({
    mutationFn: () => setRolePermissions(role.id, [...selected]),
    onError: adminOnError(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.list("roles") });
      qc.invalidateQueries({ queryKey: ["me"] }); // 자기 보유 역할 권한 변경 시 useMe 동기화
      notify.success("권한을 저장했습니다.");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>권한 편집: {role.name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-base gap-y-xs">
          {catalog.map((p) => (
            <Checkbox
              key={p.name}
              label={permissionLabel(p.name)}
              checked={selected.has(p.name)}
              onChange={() => toggle(p.name)}
            />
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="primary" loading={mutation.isPending} onClick={() => mutation.mutate()}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/components/admin/roles/RolePermissionsDialog.test.tsx`
Expected: PASS.

---

## Task 7: RoleManager (오케스트레이터)

**Files:**
- Create: `src/components/admin/roles/RoleManager.tsx`
- Test: `src/components/admin/roles/RoleManager.test.tsx`

**Interfaces:**
- Consumes: `getRoles`/`deleteRole`/`RoleResponse`(Task 2), `canManageRole`(Task 3), `RoleFormDialog`(Task 5), `RolePermissionsDialog`(Task 6), `useMe`, `adminOnError`, `adminKeys`, `notify`, `DataTable`/`Column`, `DeleteConfirmDialog`, `Button`, `Badge`, lucide `Info`.
- Produces: `RoleManager()` (default 경로에서 사용).

- [ ] **Step 1: 실패 테스트 작성** — `src/components/admin/roles/RoleManager.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getMock, deleteMock, notifySuccess } = vi.hoisted(() => ({ getMock: vi.fn(), deleteMock: vi.fn(), notifySuccess: vi.fn() }));
vi.mock("@/lib/api/roles.admin", () => ({ getRoles: getMock, deleteRole: deleteMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/lib/auth/useMe", () => ({ useMe: () => ({ data: { maxPriority: 50 } }) }));
vi.mock("./RoleFormDialog", () => ({ RoleFormDialog: () => null }));
vi.mock("./RolePermissionsDialog", () => ({ RolePermissionsDialog: () => null }));

import { RoleManager } from "./RoleManager";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
const renderManager = () => render(<QueryClientProvider client={qc}><RoleManager /></QueryClientProvider>);

const sys = { id: 1, name: "최고관리자", priority: 100, isSystem: true, description: "", permissions: [{ id: 1, name: "ROLE_MANAGE", description: "" }] };
const mine = { id: 2, name: "콘텐츠관리자", priority: 50, isSystem: false, description: "", permissions: [{ id: 1, name: "SERMON_WRITE", description: "" }] };
const higher = { id: 3, name: "부목사", priority: 70, isSystem: false, description: "", permissions: [] };

describe("RoleManager", () => {
  it("목록(역할명·우선순위·권한수·시스템 배지) 렌더", async () => {
    getMock.mockResolvedValue([sys, mine]);
    renderManager();
    await waitFor(() => expect(screen.getByText("콘텐츠관리자")).toBeDefined());
    expect(screen.getByText("시스템")).toBeDefined(); // sys 배지
    expect(screen.getByText("100")).toBeDefined();
  });

  it("시스템 역할·상위 등급 역할은 액션 비활성", async () => {
    getMock.mockResolvedValue([sys, higher, mine]);
    renderManager();
    await waitFor(() => expect(screen.getByText("콘텐츠관리자")).toBeDefined());
    expect((screen.getByRole("button", { name: "최고관리자 수정" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "부목사 삭제" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "콘텐츠관리자 수정" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("삭제 확인 후 deleteRole 호출", async () => {
    getMock.mockResolvedValue([mine]);
    deleteMock.mockResolvedValue(undefined);
    renderManager();
    await waitFor(() => expect(screen.getByText("콘텐츠관리자")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "콘텐츠관리자 삭제" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "삭제" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(2));
  });

  it("빈 목록 안내", async () => {
    getMock.mockResolvedValue([]);
    renderManager();
    await waitFor(() => expect(screen.getByText("등록된 역할이 없습니다.")).toBeDefined());
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm test src/components/admin/roles/RoleManager.test.tsx`
Expected: FAIL — 모듈 미존재.

- [ ] **Step 3: 구현** — `src/components/admin/roles/RoleManager.tsx`

```tsx
"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { adminKeys } from "@/lib/admin/queryKeys";
import { notify } from "@/lib/notify";
import { useMe } from "@/lib/auth/useMe";
import { getRoles, deleteRole, type RoleResponse } from "@/lib/api/roles.admin";
import { canManageRole } from "@/lib/admin/roleGuards";
import { RoleFormDialog } from "./RoleFormDialog";
import { RolePermissionsDialog } from "./RolePermissionsDialog";

export function RoleManager() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const maxPriority = me?.maxPriority ?? 0;
  const { data: roles = [], isLoading, isError, error } = useQuery({ queryKey: adminKeys.list("roles"), queryFn: getRoles });

  // 목록 조회 실패는 토스트로 알린다(빈 목록과 혼동 방지). notify 호출이라 effect 내 setState 아님.
  useEffect(() => {
    if (isError) adminOnError()(error);
  }, [isError, error]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RoleResponse | null>(null);
  const [permTarget, setPermTarget] = useState<RoleResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleResponse | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onError: adminOnError(), // ROLE_IN_USE는 handleApiError가 안내 토스트 처리
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.list("roles") });
      notify.success("삭제했습니다.");
      setDeleteTarget(null);
    },
  });

  const columns: Column<RoleResponse>[] = [
    { key: "name", header: "역할명", cell: (r) => r.name },
    { key: "priority", header: "우선순위", cell: (r) => <span className={typo.datetime}>{r.priority}</span> },
    { key: "permCount", header: "권한", cell: (r) => r.permissions.length },
    { key: "system", header: "시스템 역할", cell: (r) => (r.isSystem ? <Badge>시스템</Badge> : null) },
  ];

  return (
    <>
      <div className="mt-base flex items-start gap-xs rounded-xl bg-surface-soft p-base">
        <Info size={20} aria-hidden className="mt-xxs shrink-0 text-muted" />
        <p className={cn(typo.bodySm, "text-body")}>시스템 역할과 내 등급보다 높은 역할은 변경할 수 없습니다.</p>
      </div>

      <div className="mt-lg flex justify-end">
        <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>역할 추가</Button>
      </div>
      <div className="mt-base">
        <DataTable
          columns={columns}
          rows={roles}
          rowKey={(r) => r.id}
          loading={isLoading}
          empty={<p className={cn(typo.bodyMd, "text-muted")}>등록된 역할이 없습니다.</p>}
          actions={(r) => {
            const editable = canManageRole(r, maxPriority);
            const reason = r.isSystem ? "시스템 역할은 변경할 수 없습니다" : "내 등급보다 높은 역할입니다";
            return (
              <div className="flex justify-end gap-xs">
                <Button type="button" variant="tertiary" disabled={!editable} title={editable ? undefined : reason} aria-label={`${r.name} 수정`} onClick={() => setEditTarget(r)}>수정</Button>
                <Button type="button" variant="tertiary" disabled={!editable} title={editable ? undefined : reason} aria-label={`${r.name} 권한`} onClick={() => setPermTarget(r)}>권한</Button>
                <Button type="button" variant="tertiary" disabled={!editable} title={editable ? undefined : reason} aria-label={`${r.name} 삭제`} onClick={() => setDeleteTarget(r)}>삭제</Button>
              </div>
            );
          }}
        />
      </div>

      <RoleFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      <RoleFormDialog
        open={editTarget != null}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        mode="edit"
        initial={editTarget ?? undefined}
      />
      {permTarget ? (
        <RolePermissionsDialog
          key={permTarget.id}
          open
          onOpenChange={(v) => { if (!v) setPermTarget(null); }}
          role={permTarget}
        />
      ) : null}
      <DeleteConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title={deleteTarget ? `'${deleteTarget.name}' 역할을 삭제할까요?` : "역할을 삭제할까요?"}
        warning="이 역할을 삭제합니다. 되돌릴 수 없습니다. 회원에게 할당된 역할은 삭제할 수 없습니다."
        pending={remove.isPending}
        onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id); }}
      />
    </>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm test src/components/admin/roles/RoleManager.test.tsx`
Expected: PASS.

---

## Task 8: 라우트 페이지

**Files:**
- Create: `src/app/(site)/mypage/manage/roles/page.tsx`

**Interfaces:**
- Consumes: `RoleManager`(Task 7), `Container`(`@/components/shell/Container`), `RequirePermission`, `EditAccessDenied`(`@/components/admin/EditGate`).
- Produces: `ManageRolesPage` (라우트 `/mypage/manage/roles`).

(직분·미디어 페이지와 동형의 단순 래퍼 — 단위 테스트 없음. tsc/lint로 검증.)

- [ ] **Step 1: 구현** — `src/app/(site)/mypage/manage/roles/page.tsx`

```tsx
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { RoleManager } from "@/components/admin/roles/RoleManager";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 운영 전용 화면(manage-hub → kind:"manage"). 부모 manage/layout이 로그인 가드, 여기서 ROLE_MANAGE 게이트.
export default function ManageRolesPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>역할·권한 관리</h1>
      <div className="mt-xl">
        <RequirePermission permission="ROLE_MANAGE" fallback={<EditAccessDenied />}>
          <RoleManager />
        </RequirePermission>
      </div>
    </Container>
  );
}
```

- [ ] **Step 2: 타입·린트 확인**

Run: `npx tsc --noEmit && pnpm lint`
Expected: 0 오류.

- [ ] **Step 3: 수동 확인(선택)**

`pnpm dev` 후 `ROLE_MANAGE` 보유 계정으로 `/mypage`에서 "역할·권한 관리" 카드 노출 → `/mypage/manage/roles` 진입 → 목록·추가·권한·삭제·잠금 동작 확인.

---

## Task 9: DESIGN.md 등록 + 전체 게이트

**Files:**
- Modify: `.claude/rules/DESIGN.md` (어드민 공용 블록 — `position-manager` 항목군 뒤에 07 구획 추가)

- [ ] **Step 1: DESIGN.md에 컴포넌트 3종 등록**

`.claude/rules/DESIGN.md`의 어드민 공용 블록에서 `position-form-modal` 항목 바로 다음 줄에 아래 3줄을 추가한다(들여쓰기·`- **\`이름\`**:` 형식을 기존 항목과 동일하게):

```markdown
- **`role-manager`**: 역할 목록·CRUD 화면(트랙 07A). `DataTable`(역할명·우선순위·권한수·시스템) + 행 `수정`·`권한`·`삭제`. 위계 가드(`canManageRole`=`!isSystem && priority ≤ 내 maxPriority`)로 시스템·상위 역할 행은 액션 비활성. 상단 안내 배너(lucide `Info`). 공개 소비자 없음 — `["admin","roles","list"]` 클라 쿼리만 무효화.
- **`role-form-modal`**: 역할 생성·수정 Dialog(트랙 07A). `Input`(이름)+number(우선순위, `≤ maxPriority` zod 검증·헬퍼 텍스트)+`Input`(설명). 중복 시 name 인라인 에러. 수정 onSuccess는 `["roles"]`·`["me"]` 동시 무효화(자기 보유 역할 변경 대비).
- **`role-permissions-modal`**: 역할별 권한 매트릭스 Dialog(트랙 07A). `getPermissions` 카탈로그 기반 `Checkbox` 2열, 역할 보유 권한으로 시드(keyed 마운트 초기화), 저장 시 선택 권한 **이름 배열**로 전체 교체 PUT. onSuccess `["roles"]`·`["me"]` 무효화.
```

- [ ] **Step 2: 전체 게이트 실행**

Run: `pnpm test && npx tsc --noEmit && pnpm lint`
Expected: 테스트 전체 PASS · tsc 0 · lint 0.

---

## 구현 순서 요약

Task 1(권한 API) → 2(역할 API) → 3(위계 가드) → 4(스키마) → 5(RoleFormDialog) → 6(RolePermissionsDialog) → 7(RoleManager) → 8(라우트) → 9(DESIGN.md + 전체 게이트).

의존: 2는 1의 `PermissionResponse`, 3은 2의 `RoleResponse`, 5는 2·4, 6은 1·2, 7은 2·3·5·6, 8은 7.

## 스펙 대비 정밀화(구현 시 반영)

- **응답 타입 위치**: 스펙 §3-1은 `types.ts` 추가라 했으나, `types.ts`는 "공개 GET 응답 전용"(파일 주석)이고 어드민 전용 응답은 도메인-로컬이 관행(`media.admin.ts`). → `RoleResponse`는 `roles.admin.ts`, `PermissionResponse`는 `permissions.admin.ts`에 둔다.
- **삭제 ROLE_IN_USE 안내**: `handleApiError`에 이미 `ROLE_IN_USE` 케이스("회원에게 할당된 역할이라 삭제할 수 없습니다.")가 있어 커스텀 핸들러 불필요 — `adminOnError()` 기본 경로로 토스트 노출.
- **권한 다이얼로그 시드**: set-state-in-effect(lint 에러) 회피를 위해 effect 시드 대신 **keyed 마운트 + `useState` 초기화**(RoleManager가 `key={permTarget.id}`로 렌더).
```
