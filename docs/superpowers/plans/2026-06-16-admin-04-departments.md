# 부서 계층 관리(어드민 04) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영자가 `/mypage/manage/departments`에서 부서 계층을 생성·수정·삭제하는 어드민 화면을 추가한다(공개 '부서 소개'와 별개 데이터).

**Architecture:** 공개 `GET /api/departments`(평배열)를 fresh로 읽어 `buildDepartmentTree`로 조립 → preorder 평탄화 → 단일 반응형 `DataTable`(들여쓰기). 생성·수정은 Dialog 폼(항상 PUT, 낙관락 version, 상위 select 순환 제외). 쓰기는 `apiMutate`+`authFetch`, 에러는 기존 `handleApiError`가 분기. 공개 격리이므로 ISR revalidate 없이 TanStack Query 캐시만 무효화.

**Tech Stack:** Next.js(App Router) · TypeScript · TanStack Query · react-hook-form + zod · Tailwind v4 · vitest + @testing-library/react · lucide-react

> **커밋 정책(레포 규칙):** 커밋은 **사용자 명시 요청 시에만** 실행한다. 각 Task의 커밋 스텝은 TDD 절차 표시이며, 최종적으로 기능별 5~8개 커밋으로 정리한다(메모리 `commit-granularity-feature-grouped`). Co-Authored-By 태그 금지.

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/lib/api/departments.admin.ts` | 어드민 부서 쓰기(POST/PUT/DELETE) + fresh 읽기(목록·상세) + 요청 타입 |
| `src/components/admin/departments/treeUtils.ts` | 트리 평탄화·하위 id 수집·노드 탐색(순수 함수) |
| `src/components/admin/departments/schema.ts` | 부서 폼 zod 스키마 |
| `src/components/admin/departments/DepartmentFormDialog.tsx` | 생성·수정 Dialog 폼(시드·항상 PUT·순환 제외) |
| `src/components/admin/departments/DepartmentManager.tsx` | 트리 테이블 + 툴바 + 안내 + 행 액션(수정·삭제) |
| `src/app/(site)/mypage/manage/departments/page.tsx` | 라우트 진입 + `DEPT_WRITE` 게이트 |
| `.claude/rules/DESIGN.md` | 트랙 04 어드민 부서 컴포넌트 마커 append |

**무수정(완비 확인)**: `manageDomains.ts`(카드 등록됨) · `permissions.ts`(`DEPT_WRITE` 라벨) · `handleApiError.ts`(`DEPARTMENT_HAS_CHILDREN`·`OPTIMISTIC_LOCK_CONFLICT`·`INVALID_INPUT_VALUE` 분기) · `revalidate.ts`(미사용).

**검증 명령**
- 단일 테스트: `npx vitest run <파일경로>`
- 전체 테스트: `pnpm test`
- 타입체크: `npx tsc --noEmit` (lint는 타입체크 아님)
- 린트: `pnpm lint`

---

## Task 1: 어드민 데이터 레이어 (`departments.admin.ts`)

**Files:**
- Create: `src/lib/api/departments.admin.ts`
- Test: `src/lib/api/departments.admin.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/api/departments.admin.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from "vitest";

const { authFetchMock, apiMutateMock } = vi.hoisted(() => ({
  authFetchMock: vi.fn(),
  apiMutateMock: vi.fn(),
}));
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import {
  listDepartmentsAdmin,
  getDepartmentDetail,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "./departments.admin";

afterEach(() => vi.clearAllMocks());
const ok = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body, clone() { return this; } } as unknown as Response);

describe("departments.admin", () => {
  it("listDepartmentsAdmin은 공개 평배열을 no-store로 읽는다", async () => {
    authFetchMock.mockResolvedValue(
      ok([{ id: 1, name: "학생부", leader: "", parentId: null, sortOrder: 10 }]),
    );
    const list = await listDepartmentsAdmin();
    expect(authFetchMock).toHaveBeenCalledWith("/api/departments", { cache: "no-store" });
    expect(list[0].name).toBe("학생부");
  });

  it("getDepartmentDetail은 상세를 no-store로 읽는다", async () => {
    authFetchMock.mockResolvedValue(
      ok({ id: 5, name: "중등부", description: "", leader: "", parentId: 1, sortOrder: 10, createdAt: "", updatedAt: "", version: 3 }),
    );
    const d = await getDepartmentDetail(5);
    expect(authFetchMock).toHaveBeenCalledWith("/api/departments/5", { cache: "no-store" });
    expect(d.version).toBe(3);
  });

  it("createDepartment은 POST로 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 9 });
    await createDepartment({ name: "청년부", parentId: null });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/departments", {
      method: "POST",
      body: { name: "청년부", parentId: null },
    });
  });

  it("updateDepartment은 PUT로 version 포함 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 9 });
    await updateDepartment(9, { name: "청년부", parentId: null, version: 2 });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/departments/9", {
      method: "PUT",
      body: { name: "청년부", parentId: null, version: 2 },
    });
  });

  it("deleteDepartment은 DELETE를 호출한다", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteDepartment(9);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/departments/9", { method: "DELETE" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/api/departments.admin.test.ts`
Expected: FAIL — `Failed to resolve import "./departments.admin"` (모듈 없음)

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/api/departments.admin.ts`:

```typescript
import { apiMutate } from "@/lib/admin/apiMutate";
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import type { DepartmentCardResponse, DepartmentDetailResponse } from "./types";

// 어드민 부서 쓰기 요청 타입(도메인-로컬). 공유 types.ts가 아닌 여기에 둔다(병렬화 스펙).
export interface DepartmentCreateRequest {
  name: string; // 필수, ≤100
  description?: string; // ≤50000(마크다운)
  leader?: string; // ≤100
  parentId?: number | null; // null = 루트
  sortOrder?: number; // 생략 시 백엔드 max+10
}
export interface DepartmentUpdateRequest extends DepartmentCreateRequest {
  version: number; // 낙관락. parentId=null=루트화, sortOrder 생략=기존 유지(PUT 시맨틱)
}

// 읽기 — 어드민 전용 GET이 없어 공개 엔드포인트를 fresh(no-store)로 호출(read-your-writes).
export async function listDepartmentsAdmin(): Promise<DepartmentCardResponse[]> {
  const res = await authFetch("/api/departments", { cache: "no-store" });
  return (await parseJson<DepartmentCardResponse[] | null>(res)) ?? [];
}
export async function getDepartmentDetail(id: number): Promise<DepartmentDetailResponse> {
  const res = await authFetch(`/api/departments/${id}`, { cache: "no-store" });
  return parseJson<DepartmentDetailResponse>(res);
}

// 쓰기 — apiMutate(200/201/204 자동 처리, 비2xx→ApiError).
export function createDepartment(body: DepartmentCreateRequest): Promise<DepartmentDetailResponse> {
  return apiMutate<DepartmentDetailResponse>("/api/admin/departments", { method: "POST", body });
}
export function updateDepartment(id: number, body: DepartmentUpdateRequest): Promise<DepartmentDetailResponse> {
  return apiMutate<DepartmentDetailResponse>(`/api/admin/departments/${id}`, { method: "PUT", body });
}
export function deleteDepartment(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/departments/${id}`, { method: "DELETE" });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/api/departments.admin.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit** (사용자 요청 시)

```bash
git add src/lib/api/departments.admin.ts src/lib/api/departments.admin.test.ts
git commit -m "feat(admin): 부서 어드민 API 클라이언트(생성·수정·삭제·fresh 읽기) #38"
```

---

## Task 2: 트리 유틸 (`treeUtils.ts`)

**Files:**
- Create: `src/components/admin/departments/treeUtils.ts`
- Test: `src/components/admin/departments/treeUtils.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/departments/treeUtils.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildDepartmentTree } from "@/lib/api/departments";
import { flattenTree, collectDescendantIds, findNode } from "./treeUtils";
import type { DepartmentCardResponse } from "@/lib/api/types";

const list: DepartmentCardResponse[] = [
  { id: 1, name: "학생부", leader: "", parentId: null, sortOrder: 10 },
  { id: 2, name: "중등부", leader: "", parentId: 1, sortOrder: 10 },
  { id: 3, name: "고등부", leader: "", parentId: 1, sortOrder: 20 },
  { id: 4, name: "청년부", leader: "", parentId: null, sortOrder: 20 },
];

describe("treeUtils", () => {
  it("flattenTree는 preorder 순서로 depth를 부착한다", () => {
    const rows = flattenTree(buildDepartmentTree(list));
    expect(rows.map((r) => [r.node.name, r.depth])).toEqual([
      ["학생부", 0],
      ["중등부", 1],
      ["고등부", 1],
      ["청년부", 0],
    ]);
  });

  it("collectDescendantIds는 자기 제외 하위 id를 모은다", () => {
    const node = findNode(buildDepartmentTree(list), 1)!;
    expect([...collectDescendantIds(node)].sort((a, b) => a - b)).toEqual([2, 3]);
  });

  it("findNode는 서브트리에서 노드를 찾고 없으면 undefined", () => {
    const tree = buildDepartmentTree(list);
    expect(findNode(tree, 3)?.name).toBe("고등부");
    expect(findNode(tree, 99)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/departments/treeUtils.test.ts`
Expected: FAIL — `Failed to resolve import "./treeUtils"`

- [ ] **Step 3: Write minimal implementation**

Create `src/components/admin/departments/treeUtils.ts`:

```typescript
import type { DepartmentNode } from "@/lib/api/types";

export interface FlatRow {
  node: DepartmentNode;
  depth: number;
}

// preorder DFS — 트리를 화면 표시 순서대로 평탄화하며 깊이를 부착한다.
export function flattenTree(nodes: DepartmentNode[], depth = 0): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const node of nodes) {
    rows.push({ node, depth });
    if (node.children.length > 0) {
      rows.push(...flattenTree(node.children, depth + 1));
    }
  }
  return rows;
}

// 대상 노드의 모든 하위(자기 제외) id 집합 — 상위 select 순환 방지용.
export function collectDescendantIds(node: DepartmentNode): Set<number> {
  const ids = new Set<number>();
  const walk = (n: DepartmentNode) => {
    for (const child of n.children) {
      ids.add(child.id);
      walk(child);
    }
  };
  walk(node);
  return ids;
}

// 트리에서 id로 노드(서브트리 포함)를 찾는다. 없으면 undefined.
export function findNode(nodes: DepartmentNode[], id: number): DepartmentNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return undefined;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/departments/treeUtils.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit** (사용자 요청 시)

```bash
git add src/components/admin/departments/treeUtils.ts src/components/admin/departments/treeUtils.test.ts
git commit -m "feat(admin): 부서 트리 평탄화·하위 수집 유틸 #38"
```

---

## Task 3: 폼 스키마 (`schema.ts`)

**Files:**
- Create: `src/components/admin/departments/schema.ts`
- Test: `src/components/admin/departments/schema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/departments/schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { departmentSchema } from "./schema";

const base = { name: "청년부", description: "", leader: "", parentId: null, sortOrder: null };

describe("departmentSchema", () => {
  it("name이 비면 실패한다", () => {
    const r = departmentSchema.safeParse({ ...base, name: "" });
    expect(r.success).toBe(false);
  });

  it("유효한 값은 통과한다", () => {
    const r = departmentSchema.safeParse({ name: "청년부", description: "설명", leader: "김집사", parentId: 1, sortOrder: 10 });
    expect(r.success).toBe(true);
  });

  it("parentId·sortOrder는 null을 허용한다", () => {
    expect(departmentSchema.safeParse(base).success).toBe(true);
  });

  it("name은 100자를 넘으면 실패한다", () => {
    const r = departmentSchema.safeParse({ ...base, name: "가".repeat(101) });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/departments/schema.test.ts`
Expected: FAIL — `Failed to resolve import "./schema"`

- [ ] **Step 3: Write minimal implementation**

Create `src/components/admin/departments/schema.ts`:

```typescript
import { z } from "zod";

// optional().default() 미사용(zodResolver 입력/출력 타입 불일치 회피) — 기본값은 useForm defaultValues에서 주입.
// parentId/sortOrder는 number|null로 모델링(폼 select·number 입력의 빈값=null).
export const departmentSchema = z.object({
  name: z.string().min(1, "부서명을 입력해 주세요.").max(100),
  description: z.string().max(50000),
  leader: z.string().max(100),
  parentId: z.number().nullable(),
  sortOrder: z.number().int().nonnegative().nullable(),
});

export type DepartmentFormValues = z.infer<typeof departmentSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/departments/schema.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit** (사용자 요청 시)

```bash
git add src/components/admin/departments/schema.ts src/components/admin/departments/schema.test.ts
git commit -m "feat(admin): 부서 폼 zod 스키마 #38"
```

---

## Task 4: 폼 다이얼로그 (`DepartmentFormDialog.tsx`)

**Files:**
- Create: `src/components/admin/departments/DepartmentFormDialog.tsx`
- Test: `src/components/admin/departments/DepartmentFormDialog.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/departments/DepartmentFormDialog.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { createMock, updateMock, getDetailMock, notifySuccess } = vi.hoisted(() => ({
  createMock: vi.fn(),
  updateMock: vi.fn(),
  getDetailMock: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/departments.admin", () => ({
  createDepartment: createMock,
  updateDepartment: updateMock,
  getDepartmentDetail: getDetailMock,
}));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));

import { DepartmentFormDialog } from "./DepartmentFormDialog";
import type { DepartmentCardResponse } from "@/lib/api/types";

const departments: DepartmentCardResponse[] = [
  { id: 1, name: "학생부", leader: "", parentId: null, sortOrder: 10 },
  { id: 2, name: "중등부", leader: "", parentId: 1, sortOrder: 10 },
  { id: 3, name: "청년부", leader: "", parentId: null, sortOrder: 20 },
];

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
function renderDialog(ui: React.ReactNode) {
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("DepartmentFormDialog", () => {
  it("부서명이 비면 검증 메시지를 보이고 생성하지 않는다", async () => {
    renderDialog(<DepartmentFormDialog open onOpenChange={() => {}} mode="create" departments={departments} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("부서명을 입력해 주세요.")).toBeDefined());
    expect(createMock).not.toHaveBeenCalled();
  });

  it("생성은 POST body를 보낸다(루트=parentId null)", async () => {
    createMock.mockResolvedValue({ id: 9 });
    renderDialog(<DepartmentFormDialog open onOpenChange={() => {}} mode="create" departments={departments} />);
    fireEvent.change(screen.getByLabelText("부서명"), { target: { value: "새부서" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ name: "새부서", parentId: null })),
    );
    expect(notifySuccess).toHaveBeenCalled();
  });

  it("수정은 상세로 version을 시드하고 PUT에 version을 포함한다", async () => {
    getDetailMock.mockResolvedValue({
      id: 2, name: "중등부", description: "", leader: "이전도", parentId: 1, sortOrder: 10,
      createdAt: "", updatedAt: "", version: 4,
    });
    updateMock.mockResolvedValue({ id: 2 });
    renderDialog(<DepartmentFormDialog open onOpenChange={() => {}} mode="edit" editId={2} departments={departments} />);
    await waitFor(() => expect(getDetailMock).toHaveBeenCalledWith(2));
    await waitFor(() => expect((screen.getByLabelText("부서명") as HTMLInputElement).value).toBe("중등부"));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith(2, expect.objectContaining({ version: 4 })),
    );
  });

  it("수정 시 상위 옵션에서 자기 자신과 하위를 제외한다", async () => {
    getDetailMock.mockResolvedValue({
      id: 1, name: "학생부", description: "", leader: "", parentId: null, sortOrder: 10,
      createdAt: "", updatedAt: "", version: 1,
    });
    renderDialog(<DepartmentFormDialog open onOpenChange={() => {}} mode="edit" editId={1} departments={departments} />);
    await waitFor(() => expect(getDetailMock).toHaveBeenCalledWith(1));
    const select = screen.getByLabelText("상위 부서") as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    // 자기(1)+하위(2) 제외 → (없음)과 청년부(3)만 남는다
    expect(optionValues).toEqual(["", "3"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/departments/DepartmentFormDialog.test.tsx`
Expected: FAIL — `Failed to resolve import "./DepartmentFormDialog"`

- [ ] **Step 3: Write minimal implementation**

Create `src/components/admin/departments/DepartmentFormDialog.tsx`:

```typescript
"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { adminKeys } from "@/lib/admin/queryKeys";
import { buildDepartmentTree } from "@/lib/api/departments";
import { collectDescendantIds, findNode } from "./treeUtils";
import {
  createDepartment,
  updateDepartment,
  getDepartmentDetail,
  type DepartmentCreateRequest,
} from "@/lib/api/departments.admin";
import type { DepartmentCardResponse, DepartmentDetailResponse } from "@/lib/api/types";
import { departmentSchema, type DepartmentFormValues } from "./schema";

export interface DepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  editId?: number; // edit 시 필수 — 열 때 상세로 version·값 시드
  departments: DepartmentCardResponse[]; // 상위 select 옵션 소스(평배열)
  onSaved?: () => void;
}

const EMPTY: DepartmentFormValues = {
  name: "",
  description: "",
  leader: "",
  parentId: null,
  sortOrder: null,
};

// 선택 빈값은 전송에서 제외. parentId는 null 그대로 전송(PUT 루트화 의미 보존), sortOrder null은 생략.
function toCreateBody(v: DepartmentFormValues): DepartmentCreateRequest {
  const opt = (s: string) => (s.trim() === "" ? undefined : s);
  return {
    name: v.name,
    description: opt(v.description),
    leader: opt(v.leader),
    parentId: v.parentId,
    sortOrder: v.sortOrder ?? undefined,
  };
}

function seedValues(d: DepartmentDetailResponse): DepartmentFormValues {
  return {
    name: d.name,
    description: d.description ?? "",
    leader: d.leader ?? "",
    parentId: d.parentId,
    sortOrder: d.sortOrder,
  };
}

export function DepartmentFormDialog({
  open,
  onOpenChange,
  mode,
  editId,
  departments,
  onSaved,
}: DepartmentFormDialogProps) {
  const qc = useQueryClient();
  const [version, setVersion] = useState(0);
  const [seeding, setSeeding] = useState(false); // edit version 시드 중 — 제출 차단(stale version 409 방지)
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: EMPTY,
  });

  // 상위 옵션: edit 시 자기 자신 + 모든 하위 제외(순환 방지). 목록 기준으로 계산(시드 상세와 무관).
  const parentOptions = useMemo(() => {
    if (mode === "edit" && editId != null) {
      const self = findNode(buildDepartmentTree(departments), editId);
      const excluded = self ? collectDescendantIds(self) : new Set<number>();
      excluded.add(editId);
      return departments.filter((d) => !excluded.has(d.id));
    }
    return departments;
  }, [mode, editId, departments]);

  // 열릴 때: create는 빈 폼, edit는 상세(no-store)로 폼·version 시드(시드 중 제출 차단).
  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      reset(EMPTY);
      setVersion(0);
      return;
    }
    if (editId == null) return;
    setSeeding(true);
    getDepartmentDetail(editId)
      .then((d) => {
        setVersion(d.version);
        reset(seedValues(d));
      })
      .catch((e) => adminOnError()(e))
      .finally(() => setSeeding(false));
  }, [open, mode, editId, reset]);

  const mutation = useMutation({
    mutationFn: (v: DepartmentFormValues) => {
      const body = toCreateBody(v);
      if (mode === "edit" && editId != null) {
        // 항상 PUT — 전체 폼이므로 루트화(parentId null)·필드 교체를 한 경로로 처리(낙관락 version).
        return updateDepartment(editId, { ...body, version });
      }
      return createDepartment(body);
    },
    onError: adminOnError({
      onFieldErrors: (fes) =>
        fes.forEach((fe) => setError(fe.field as keyof DepartmentFormValues, { message: fe.reason })),
      onReedit: () => {
        if (editId != null)
          getDepartmentDetail(editId)
            .then((d) => {
              setVersion(d.version);
              reset(seedValues(d));
            })
            .catch((e) => adminOnError()(e));
      },
    }),
    onSuccess: () => {
      // 공개 소개는 상수 구동이라 ISR revalidate 불필요 — 어드민 캐시만 무효화.
      qc.invalidateQueries({ queryKey: adminKeys.list("departments") });
      notify.success("저장했습니다.");
      onOpenChange(false);
      onSaved?.();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "부서 수정" : "새 부서"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-base">
          <div className="flex flex-col gap-xxs">
            <label htmlFor="dept-name" className={cn(typo.bodySm, "text-ink")}>부서명</label>
            <Input id="dept-name" error={errors.name?.message} {...register("name")} />
          </div>
          <div className="flex flex-col gap-xxs">
            <label htmlFor="dept-leader" className={cn(typo.bodySm, "text-ink")}>담당(선택)</label>
            <Input id="dept-leader" error={errors.leader?.message} {...register("leader")} />
          </div>
          <div className="flex flex-col gap-xxs">
            <label htmlFor="dept-parent" className={cn(typo.bodySm, "text-ink")}>상위 부서</label>
            <Controller
              control={control}
              name="parentId"
              render={({ field }) => (
                <select
                  id="dept-parent"
                  className={cn(
                    typo.bodyMd,
                    "h-12 rounded-md border border-hairline bg-canvas px-4 text-ink",
                    "focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary outline-hidden",
                  )}
                  value={field.value === null ? "" : String(field.value)}
                  onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                >
                  <option value="">(없음 — 최상위 부서)</option>
                  {parentOptions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
            />
          </div>
          <div className="flex flex-col gap-xxs">
            <label htmlFor="dept-sortOrder" className={cn(typo.bodySm, "text-ink")}>정렬 순서(선택)</label>
            <Controller
              control={control}
              name="sortOrder"
              render={({ field }) => (
                <Input
                  id="dept-sortOrder"
                  type="number"
                  inputMode="numeric"
                  value={field.value === null ? "" : String(field.value)}
                  onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                  error={errors.sortOrder?.message}
                />
              )}
            />
          </div>
          <div className="flex flex-col gap-xxs">
            <span className={cn(typo.bodySm, "text-ink")}>설명(선택)</span>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <MarkdownEditor value={field.value} onChange={field.onChange} id="dept-description" rows={5} />
              )}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" variant="primary" loading={mutation.isPending} disabled={seeding}>저장</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/departments/DepartmentFormDialog.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit** (사용자 요청 시)

```bash
git add src/components/admin/departments/DepartmentFormDialog.tsx src/components/admin/departments/DepartmentFormDialog.test.tsx
git commit -m "feat(admin): 부서 생성·수정 다이얼로그(항상 PUT·순환 제외·낙관락) #38"
```

---

## Task 5: 트리 매니저 (`DepartmentManager.tsx`)

**Files:**
- Create: `src/components/admin/departments/DepartmentManager.tsx`
- Test: `src/components/admin/departments/DepartmentManager.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/departments/DepartmentManager.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { listMock, deleteMock, getDetailMock, notifySuccess } = vi.hoisted(() => ({
  listMock: vi.fn(),
  deleteMock: vi.fn(),
  getDetailMock: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/departments.admin", () => ({
  listDepartmentsAdmin: listMock,
  deleteDepartment: deleteMock,
  createDepartment: vi.fn(),
  updateDepartment: vi.fn(),
  getDepartmentDetail: getDetailMock,
}));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));

import { DepartmentManager } from "./DepartmentManager";

const departments = [
  { id: 1, name: "학생부", leader: "김집사", parentId: null, sortOrder: 10 },
  { id: 2, name: "중등부", leader: "이전도", parentId: 1, sortOrder: 10 },
];

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
function renderManager() {
  return render(
    <QueryClientProvider client={qc}>
      <DepartmentManager />
    </QueryClientProvider>,
  );
}

describe("DepartmentManager", () => {
  it("부서를 트리 순서로 렌더한다", async () => {
    listMock.mockResolvedValue(departments);
    renderManager();
    await waitFor(() => expect(screen.getByText("학생부")).toBeDefined());
    expect(screen.getByText("중등부")).toBeDefined();
  });

  it("공개 소개와 별개 데이터라는 안내를 보여준다", async () => {
    listMock.mockResolvedValue([]);
    renderManager();
    await waitFor(() => expect(screen.getByText(/자동 반영되지 않습니다/)).toBeDefined());
  });

  it("삭제 확인 후 deleteDepartment를 호출한다", async () => {
    listMock.mockResolvedValue(departments);
    deleteMock.mockResolvedValue(undefined);
    renderManager();
    await waitFor(() => expect(screen.getByText("학생부")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "학생부 삭제" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "삭제" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(1));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/departments/DepartmentManager.test.tsx`
Expected: FAIL — `Failed to resolve import "./DepartmentManager"`

- [ ] **Step 3: Write minimal implementation**

Create `src/components/admin/departments/DepartmentManager.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Info, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { adminKeys } from "@/lib/admin/queryKeys";
import { buildDepartmentTree } from "@/lib/api/departments";
import { listDepartmentsAdmin, deleteDepartment } from "@/lib/api/departments.admin";
import { flattenTree, type FlatRow } from "./treeUtils";
import { DepartmentFormDialog } from "./DepartmentFormDialog";
import type { DepartmentCardResponse } from "@/lib/api/types";

// depth별 좌패딩(spacing 토큰). 인라인 px 금지 — 3단계 이상은 마지막 단계로 캡(교회 조직 최대 깊이 가정).
const INDENT = ["pl-0", "pl-lg", "pl-xxl"];
const indentClass = (depth: number) => INDENT[Math.min(depth, INDENT.length - 1)];

const columns: Column<FlatRow>[] = [
  {
    key: "name",
    header: "부서명",
    cell: ({ node, depth }) => (
      <span className={cn("flex min-w-0 items-center", indentClass(depth))}>
        {depth > 0 ? <span aria-hidden className="mr-xxs text-muted">└</span> : null}
        <span className="truncate">{node.name}</span>
      </span>
    ),
  },
  {
    key: "leader",
    header: "담당",
    cell: ({ node }) => <span className="truncate">{node.leader?.trim() ? node.leader : "—"}</span>,
  },
  {
    key: "sortOrder",
    header: "정렬 순서",
    cell: ({ node }) => node.sortOrder,
    className: "hidden sm:table-cell",
  },
];

export function DepartmentManager() {
  const qc = useQueryClient();
  const { data: departments = [], isLoading } = useQuery({
    queryKey: adminKeys.list("departments"),
    queryFn: listDepartmentsAdmin,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentCardResponse | null>(null);

  const rows = flattenTree(buildDepartmentTree(departments));

  const remove = useMutation({
    mutationFn: (id: number) => deleteDepartment(id),
    onError: adminOnError(), // 409 DEPARTMENT_HAS_CHILDREN 등은 handleApiError가 토스트 처리
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.list("departments") });
      notify.success("삭제했습니다.");
      setDeleteTarget(null);
    },
  });

  return (
    <>
      <div className="mt-base flex items-start gap-xs rounded-xl bg-surface-soft p-base">
        <Info size={20} aria-hidden className="mt-xxs shrink-0 text-muted" />
        <p className={cn(typo.bodySm, "text-body")}>
          이 화면은 운영용 부서 데이터를 관리합니다. 공개 ‘교육·부서 소개’ 페이지는 별도 콘텐츠로
          구성되어 있어, 여기서의 변경이 자동 반영되지 않습니다.
        </p>
      </div>

      <div className="mt-lg flex flex-col gap-base sm:flex-row sm:items-center sm:justify-between">
        <p className={cn(typo.bodySm, "text-muted")}>부서 계층을 생성·수정·삭제합니다.</p>
        <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>새 부서</Button>
      </div>

      <div className="mt-base">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={({ node }) => node.id}
          loading={isLoading}
          empty={<p className={cn(typo.bodyMd, "text-muted")}>등록된 부서가 없습니다.</p>}
          actions={({ node }) => (
            <span className="flex justify-end gap-xs">
              <Button type="button" variant="tertiary" onClick={() => setEditId(node.id)} aria-label={`${node.name} 수정`}>
                <Pencil size={18} aria-hidden />
                <span className="hidden sm:inline">수정</span>
              </Button>
              <Button type="button" variant="tertiary" onClick={() => setDeleteTarget(node)} aria-label={`${node.name} 삭제`}>
                <Trash2 size={18} aria-hidden />
                <span className="hidden sm:inline">삭제</span>
              </Button>
            </span>
          )}
        />
      </div>

      <DepartmentFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        departments={departments}
      />
      <DepartmentFormDialog
        open={editId != null}
        onOpenChange={(v) => { if (!v) setEditId(null); }}
        mode="edit"
        editId={editId ?? undefined}
        departments={departments}
      />
      <DeleteConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title={deleteTarget ? `‘${deleteTarget.name}’ 부서를 삭제할까요?` : "부서를 삭제할까요?"}
        warning="하위 부서가 있으면 삭제할 수 없습니다. 삭제 후 되돌릴 수 없습니다."
        pending={remove.isPending}
        onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id); }}
      />
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/departments/DepartmentManager.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit** (사용자 요청 시)

```bash
git add src/components/admin/departments/DepartmentManager.tsx src/components/admin/departments/DepartmentManager.test.tsx
git commit -m "feat(admin): 부서 트리 매니저(들여쓰기 테이블·행 액션·삭제 확인) #38"
```

---

## Task 6: 라우트 페이지 (`page.tsx`)

**Files:**
- Create: `src/app/(site)/mypage/manage/departments/page.tsx`

- [ ] **Step 1: Write the implementation**

`manageDomains.ts`에 이미 `/mypage/manage/departments`(kind="manage", `DEPT_WRITE`)가 등록돼 `ManageHub`가 카드를 노출한다. 미디어(05) 페이지 패턴을 따라 Container+제목은 항상 렌더하고 `DEPT_WRITE` 게이트로 본문만 가린다. `useSearchParams` 미사용이라 Suspense 불필요.

Create `src/app/(site)/mypage/manage/departments/page.tsx`:

```typescript
"use client";

import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { DepartmentManager } from "@/components/admin/departments/DepartmentManager";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export default function ManageDepartmentsPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>부서 관리</h1>
      <RequirePermission permission="DEPT_WRITE" fallback={<EditAccessDenied />}>
        <DepartmentManager />
      </RequirePermission>
    </Container>
  );
}
```

- [ ] **Step 2: Verify typecheck + build of the route**

Run: `npx tsc --noEmit`
Expected: PASS (타입 에러 없음)

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 3: Commit** (사용자 요청 시)

```bash
git add "src/app/(site)/mypage/manage/departments/page.tsx"
git commit -m "feat(admin): 부서 관리 라우트(/mypage/manage/departments) #38"
```

---

## Task 7: DESIGN.md 컴포넌트 마커 append

**Files:**
- Modify: `.claude/rules/DESIGN.md` (어드민 공용 섹션 끝, `gallery-photo-manager` 항목 다음)

- [ ] **Step 1: Read the section**

Run: 어드민 공용(Admin Shared) 섹션에서 `gallery-photo-manager` 줄을 찾는다(현재 그 섹션의 마지막 항목).

- [ ] **Step 2: Append two markers**

`gallery-photo-manager` 항목 줄 바로 아래에 추가(자기 구획만 추가, 다른 줄 변경 금지):

```markdown
- **`department-admin-manager`**: 어드민 부서 계층 관리 화면(트랙 04). 공개 `GET /api/departments`(no-store)를 `buildDepartmentTree`로 조립해 들여쓰기 평면 `DataTable`로 표시(정렬순서 컬럼 `hidden sm:table-cell`), 행별 수정·삭제(`DeleteConfirmDialog`), 공개 소개와 별개 데이터 안내 배너(lucide `Info`). 공개 격리라 ISR revalidate 미사용, 어드민 쿼리 캐시만 무효화.
- **`department-form-modal`**: 부서 생성·수정 Dialog(트랙 04). 이름·담당(`Input`)·상위 부서(native `select`, edit 시 자기+하위 제외로 순환 방지)·정렬 순서(number)·설명(`MarkdownEditor`). 생성=POST, 수정=상세 시드 후 **항상 PUT**(루트화=상위 `(없음)`)·낙관락 version.
```

- [ ] **Step 3: Verify**

Run: `git diff .claude/rules/DESIGN.md`
Expected: 2줄 추가만(다른 변경 없음)

- [ ] **Step 4: Commit** (사용자 요청 시)

```bash
git add .claude/rules/DESIGN.md
git commit -m "docs(design): 트랙 04 어드민 부서 컴포넌트 마커 등록 #38"
```

---

## Task 8: 최종 검증

- [ ] **Step 1: 전체 테스트**

Run: `pnpm test`
Expected: 신규 5개 파일 테스트 포함 전부 PASS (departments.admin · treeUtils · schema · DepartmentFormDialog · DepartmentManager)

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 린트**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 4: 수동 확인(개발 서버)**

Run: `pnpm dev` 후 로그인(`DEPT_WRITE` 보유 계정) → `/mypage` 관리 허브에 "부서 관리" 카드 노출 확인 → `/mypage/manage/departments` 진입 → 트리 표시·생성·수정(루트화 포함)·삭제(하위 있는 부서 삭제 시 차단 토스트)·모바일 폭(정렬순서 컬럼 숨김) 확인.

- [ ] **Step 5: 커밋 정리(사용자 요청 시)**

기능별 5~8개로 정리(메모리 규약). 위 Task별 커밋이 이미 기능 경계와 일치하면 그대로, 과분할이면 `git reset --soft`로 묶는다(백업 ref + 트리 동일성 검증).

---

## Self-Review

**1. Spec coverage** (스펙 §1 작업 내용 대비)
- 부서 목록 계층 표시 + 행별 수정·삭제 → Task 5 ✓
- 생성·수정(이름·설명·담당·상위·정렬) → Task 4 ✓
- 상위 변경 시 자기·하위 차단(순환 방지) → Task 2(`collectDescendantIds`) + Task 4(`parentOptions`) ✓
- 하위 있으면 삭제 차단 → 백엔드 409 `DEPARTMENT_HAS_CHILDREN` + 기존 `handleApiError` 토스트(Task 5 `adminOnError()`) ✓
- 루트화/수정 경로 통합(항상 PUT) → Task 4 mutation ✓
- 동시 수정 충돌 안내 → Task 4 `onReedit`(409 reseed) ✓
- 공개 소개와 별개 안내 → Task 5 안내 배너 ✓
- 데이터 소스(공개 GET fresh) → Task 1 ✓
- 반응형(단일 테이블·컬럼 숨김) → Task 5 컬럼 `hidden sm:table-cell` + DataTable `overflow-x-auto` ✓
- 허브 카드 연결 → 무수정(완비) ✓

**2. Placeholder scan**: TBD/TODO/"적절히 처리" 없음. 모든 코드 스텝에 완전한 코드 포함 ✓

**3. Type consistency**:
- `DepartmentFormValues`(name·description·leader·parentId·sortOrder) — schema(Task 3) ↔ Dialog(Task 4) 일치 ✓
- `FlatRow`{node, depth} — treeUtils(Task 2) ↔ Manager columns(Task 5) 일치 ✓
- `DepartmentCreateRequest`/`DepartmentUpdateRequest`(extends + version) — Task 1 정의 ↔ Task 4 사용 일치 ✓
- `listDepartmentsAdmin`·`getDepartmentDetail`·`createDepartment`·`updateDepartment`·`deleteDepartment` — Task 1 export ↔ Task 4·5 import 일치 ✓
- `findNode`·`collectDescendantIds`·`flattenTree` — Task 2 export ↔ Task 4·5 import 일치 ✓
- `adminKeys.list("departments")` — Task 4·5 동일 키 ✓
