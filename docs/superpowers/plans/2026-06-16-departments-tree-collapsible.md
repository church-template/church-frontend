# 부서 관리 UI — 접이식 단일 트리(재개편) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 직전 마스터–디테일(2단) 부서 화면을 **접이식 단일 트리 + 캡 컬럼(R1 행)**으로 교체해 직관성과 행 가독성을 개선한다.

**Architecture:** 표현 계층만 교체. 데이터·스키마·`DepartmentFormDialog`(`defaultParentId`)·`DeleteConfirmDialog`는 재사용. `treeUtils`에 가시 평탄화 2개 추가. `ClusterList`/`ClusterDetail` 제거, 신규 `DepartmentTree`, `DepartmentManager` 재작성. 선택 상태 없음(단순화), 접힘 상태(Set)만.

**Tech Stack:** Next.js(App Router) · TypeScript · TanStack Query · Tailwind v4 · vitest + @testing-library/react · lucide-react

> **커밋 정책(레포 규칙):** 커밋은 **사용자 명시 요청 시에만**. Task 사이 커밋 보류. Co-Authored-By·GPG 금지.

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `treeUtils.ts` | (변경) `flattenVisible`·`collectCollapsibleIds` 추가 |
| `DepartmentTree.tsx` | (신규) 접이식 트리(가시 행·chevron·R1 행·노드 액션) |
| `DepartmentManager.tsx` | (재작성) 접힘 상태·툴바·캡 컬럼·다이얼로그 오케스트레이션 |
| `ClusterList.tsx`/`ClusterDetail.tsx`(+test) | (제거) 마스터–디테일 잔재 — 사용자 삭제 허락됨 |
| `.claude/rules/DESIGN.md` | (변경) cluster-* 마커 제거, department-tree 추가, manager 갱신 |

**무변경 재사용**: `departments.admin.ts` · `schema.ts` · `DepartmentFormDialog.tsx` · `DeleteConfirmDialog` · `adminOnError`·`notify`·`adminKeys`·`buildDepartmentTree` · page.tsx · `treeUtils`의 `collectDescendantIds`·`findNode`.

**검증**: 단일 `npx vitest run <파일>` · 전체 `pnpm test` · `npx tsc --noEmit` · `./node_modules/.bin/eslint <파일> --format json` 또는 `pnpm lint`.

---

## Task 1: treeUtils — `flattenVisible`·`collectCollapsibleIds`

**Files:**
- Modify: `src/components/admin/departments/treeUtils.ts`
- Test: `src/components/admin/departments/treeUtils.test.ts` (추가)

- [ ] **Step 1: Write the failing test**

`treeUtils.test.ts`의 import 줄을 다음으로 교체(함수 2개 추가):
```typescript
import { flattenTree, collectDescendantIds, findNode, flattenVisible, collectCollapsibleIds } from "./treeUtils";
```
그리고 파일 **맨 끝**에 새 describe 블록을 추가:
```typescript
// 깊이 2 포함 픽스처(가시 평탄화용)
const deepList: DepartmentCardResponse[] = [
  { id: 1, name: "학생부", leader: "", parentId: null, sortOrder: 10 },
  { id: 2, name: "중등부", leader: "", parentId: 1, sortOrder: 10 },
  { id: 3, name: "고등부", leader: "", parentId: 1, sortOrder: 20 },
  { id: 5, name: "1학년부", leader: "", parentId: 2, sortOrder: 10 },
  { id: 4, name: "청년부", leader: "", parentId: null, sortOrder: 20 },
];

describe("flattenVisible / collectCollapsibleIds", () => {
  it("접힘 없으면 전체 평탄화 + depth·hasChildren", () => {
    const rows = flattenVisible(buildDepartmentTree(deepList), new Set());
    expect(rows.map((r) => [r.node.name, r.depth, r.hasChildren])).toEqual([
      ["학생부", 0, true],
      ["중등부", 1, true],
      ["1학년부", 2, false],
      ["고등부", 1, false],
      ["청년부", 0, false],
    ]);
  });

  it("접힌 노드의 하위는 제외한다", () => {
    const rows = flattenVisible(buildDepartmentTree(deepList), new Set([2]));
    expect(rows.map((r) => r.node.name)).toEqual(["학생부", "중등부", "고등부", "청년부"]);
  });

  it("collectCollapsibleIds는 자식 있는 노드 id만 모은다", () => {
    const ids = collectCollapsibleIds(buildDepartmentTree(deepList));
    expect([...ids].sort((a, b) => a - b)).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/departments/treeUtils.test.ts`
Expected: FAIL — `flattenVisible`/`collectCollapsibleIds` export 없음.

- [ ] **Step 3: Implement — `treeUtils.ts` 끝에 추가**

```typescript
export interface VisibleRow {
  node: DepartmentNode;
  depth: number;
  hasChildren: boolean;
}

// 접힌 노드의 하위는 건너뛰는 가시 평탄화(preorder). collapsed에 든 노드는 표시하되 자식은 숨긴다.
export function flattenVisible(
  nodes: DepartmentNode[],
  collapsed: Set<number>,
  depth = 0,
): VisibleRow[] {
  const rows: VisibleRow[] = [];
  for (const node of nodes) {
    const hasChildren = node.children.length > 0;
    rows.push({ node, depth, hasChildren });
    if (hasChildren && !collapsed.has(node.id)) {
      rows.push(...flattenVisible(node.children, collapsed, depth + 1));
    }
  }
  return rows;
}

// 자식 있는 모든 노드 id(전체 접기용).
export function collectCollapsibleIds(nodes: DepartmentNode[]): Set<number> {
  const ids = new Set<number>();
  const walk = (list: DepartmentNode[]) => {
    for (const node of list) {
      if (node.children.length > 0) {
        ids.add(node.id);
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return ids;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/departments/treeUtils.test.ts`
Expected: PASS (기존 3 + 신규 3 = 6).

- [ ] **Step 5: Verify** — `npx tsc --noEmit` 무오류 · `./node_modules/.bin/eslint src/components/admin/departments/treeUtils.ts --format json` errorCount 0.

- [ ] **Step 6: Commit** (사용자 요청 시)
```bash
git add src/components/admin/departments/treeUtils.ts src/components/admin/departments/treeUtils.test.ts
git commit -m "feat : 부서 트리 가시 평탄화·접힘 유틸 #38"
```

---

## Task 2: `DepartmentTree.tsx` — 접이식 트리

**Files:**
- Create: `src/components/admin/departments/DepartmentTree.tsx`
- Test: `src/components/admin/departments/DepartmentTree.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/departments/DepartmentTree.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { buildDepartmentTree } from "@/lib/api/departments";
import { DepartmentTree } from "./DepartmentTree";

const flat = [
  { id: 1, name: "학생부", leader: "김집사", parentId: null, sortOrder: 10 },
  { id: 2, name: "중등부", leader: "이전도", parentId: 1, sortOrder: 10 },
  { id: 3, name: "고등부", leader: "박전도", parentId: 1, sortOrder: 20 },
  { id: 5, name: "1학년부", leader: "김교사", parentId: 2, sortOrder: 10 },
  { id: 4, name: "청년부", leader: "최목사", parentId: null, sortOrder: 20 },
];
const roots = buildDepartmentTree(flat);
function noop() {}

describe("DepartmentTree", () => {
  it("접힘 없으면 모든 노드를 렌더한다", () => {
    render(<DepartmentTree roots={roots} collapsed={new Set()} onToggle={noop} onCreateChild={noop} onEdit={noop} onDelete={noop} />);
    ["학생부", "중등부", "1학년부", "고등부", "청년부"].forEach((n) => expect(screen.getByText(n)).toBeDefined());
  });

  it("접힌 노드의 하위는 숨긴다", () => {
    render(<DepartmentTree roots={roots} collapsed={new Set([2])} onToggle={noop} onCreateChild={noop} onEdit={noop} onDelete={noop} />);
    expect(screen.queryByText("1학년부")).toBeNull();
  });

  it("chevron 클릭 시 onToggle, 잎 노드엔 접기/펼치기 버튼이 없다", () => {
    const onToggle = vi.fn();
    render(<DepartmentTree roots={roots} collapsed={new Set()} onToggle={onToggle} onCreateChild={noop} onEdit={noop} onDelete={noop} />);
    fireEvent.click(screen.getByRole("button", { name: "학생부 접기" }));
    expect(onToggle).toHaveBeenCalledWith(1);
    expect(screen.queryByRole("button", { name: /청년부 (접기|펼치기)/ })).toBeNull();
  });

  it("노드 ＋하위·수정·삭제가 올바른 인자로 콜백한다", () => {
    const onCreateChild = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<DepartmentTree roots={roots} collapsed={new Set()} onToggle={noop} onCreateChild={onCreateChild} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "중등부 하위 추가" }));
    expect(onCreateChild).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "중등부 수정" }));
    expect(onEdit).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "중등부 삭제" }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });

  it("부서가 없으면 안내를 보인다", () => {
    render(<DepartmentTree roots={[]} collapsed={new Set()} onToggle={noop} onCreateChild={noop} onEdit={noop} onDelete={noop} />);
    expect(screen.getByText("등록된 부서가 없습니다.")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/components/admin/departments/DepartmentTree.test.tsx` → `Failed to resolve import "./DepartmentTree"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/admin/departments/DepartmentTree.tsx`:
```typescript
"use client";

import { ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { flattenVisible } from "./treeUtils";
import type { DepartmentNode } from "@/lib/api/types";

// depth별 좌패딩(spacing 토큰). 3단↑은 마지막으로 캡.
const INDENT = ["pl-0", "pl-lg", "pl-xxl"];
const indentClass = (depth: number) => INDENT[Math.min(depth, INDENT.length - 1)];
const leaderOf = (node: DepartmentNode) => (node.leader?.trim() ? node.leader : "—");

export interface DepartmentTreeProps {
  roots: DepartmentNode[];
  collapsed: Set<number>;
  onToggle: (id: number) => void;
  onCreateChild: (parentId: number) => void;
  onEdit: (id: number) => void;
  onDelete: (node: DepartmentNode) => void;
}

// 노드 액션 — 아이콘 + lg 이상 텍스트(고령 사용자 배려), 모바일 아이콘-only.
function NodeActions({
  node,
  onCreateChild,
  onEdit,
  onDelete,
}: {
  node: DepartmentNode;
  onCreateChild: (parentId: number) => void;
  onEdit: (id: number) => void;
  onDelete: (node: DepartmentNode) => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-xxs whitespace-nowrap">
      <Button type="button" variant="tertiary" onClick={() => onCreateChild(node.id)} aria-label={`${node.name} 하위 추가`}>
        <Plus size={18} aria-hidden />
        <span className="hidden lg:inline">하위</span>
      </Button>
      <Button type="button" variant="tertiary" onClick={() => onEdit(node.id)} aria-label={`${node.name} 수정`}>
        <Pencil size={18} aria-hidden />
        <span className="hidden lg:inline">수정</span>
      </Button>
      <Button type="button" variant="tertiary" onClick={() => onDelete(node)} aria-label={`${node.name} 삭제`}>
        <Trash2 size={18} aria-hidden />
        <span className="hidden lg:inline">삭제</span>
      </Button>
    </span>
  );
}

// 접이식 단일 트리(표현) — 가시 행만 렌더. 자식 있는 노드만 chevron, 잎 노드는 동일 폭 스페이서로 정렬.
export function DepartmentTree({ roots, collapsed, onToggle, onCreateChild, onEdit, onDelete }: DepartmentTreeProps) {
  if (roots.length === 0) {
    return <p className={cn(typo.bodyMd, "text-muted")}>등록된 부서가 없습니다.</p>;
  }
  const rows = flattenVisible(roots, collapsed);
  return (
    <ul className="flex flex-col">
      {rows.map(({ node, depth, hasChildren }) => {
        const isCollapsed = collapsed.has(node.id);
        return (
          <li key={node.id} className="flex items-center gap-sm border-b border-hairline py-sm">
            <span className={cn("flex min-w-0 flex-1 items-center", indentClass(depth))}>
              <span className="mr-xxs flex w-6 shrink-0 items-center justify-center">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => onToggle(node.id)}
                    aria-label={isCollapsed ? `${node.name} 펼치기` : `${node.name} 접기`}
                    aria-expanded={!isCollapsed}
                    className="text-muted hover:text-ink"
                  >
                    {isCollapsed ? <ChevronRight size={18} aria-hidden /> : <ChevronDown size={18} aria-hidden />}
                  </button>
                ) : null}
              </span>
              <span className={cn(typo.bodyMd, "truncate text-ink")}>{node.name}</span>
              <span className={cn(typo.bodySm, "ml-xs shrink-0 text-muted")}>· {leaderOf(node)}</span>
            </span>
            <NodeActions node={node} onCreateChild={onCreateChild} onEdit={onEdit} onDelete={onDelete} />
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/components/admin/departments/DepartmentTree.test.tsx` → PASS (5).

- [ ] **Step 5: Verify** — `npx tsc --noEmit` 무오류 · `./node_modules/.bin/eslint src/components/admin/departments/DepartmentTree.tsx --format json` errorCount 0 (`w-6` numeric 유틸·`lg:inline` 정상; 임의 `[px]` 없음).

- [ ] **Step 6: Commit** (사용자 요청 시)
```bash
git add src/components/admin/departments/DepartmentTree.tsx src/components/admin/departments/DepartmentTree.test.tsx
git commit -m "feat : 부서 접이식 트리 컴포넌트(chevron·R1 행·노드 액션) #38"
```

---

## Task 3: `DepartmentManager.tsx` 재작성

**Files:**
- Rewrite: `src/components/admin/departments/DepartmentManager.tsx`
- Rewrite: `src/components/admin/departments/DepartmentManager.test.tsx`

- [ ] **Step 1: Write the failing test (전체 교체)**

`DepartmentManager.test.tsx` 전체를 다음으로 교체:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { listMock, deleteMock, getDetailMock, createMock, updateMock, notifySuccess } = vi.hoisted(() => ({
  listMock: vi.fn(),
  deleteMock: vi.fn(),
  getDetailMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/departments.admin", () => ({
  listDepartmentsAdmin: listMock,
  deleteDepartment: deleteMock,
  getDepartmentDetail: getDetailMock,
  createDepartment: createMock,
  updateDepartment: updateMock,
}));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));

import { DepartmentManager } from "./DepartmentManager";

const flat = [
  { id: 1, name: "학생부", leader: "김집사", parentId: null, sortOrder: 10 },
  { id: 2, name: "중등부", leader: "이전도", parentId: 1, sortOrder: 10 },
  { id: 3, name: "고등부", leader: "박전도", parentId: 1, sortOrder: 20 },
  { id: 5, name: "1학년부", leader: "김교사", parentId: 2, sortOrder: 10 },
  { id: 4, name: "청년부", leader: "최목사", parentId: null, sortOrder: 20 },
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

describe("DepartmentManager (접이식 트리)", () => {
  it("기본은 전체 펼침 — 깊은 노드까지 보인다", async () => {
    listMock.mockResolvedValue(flat);
    renderManager();
    await waitFor(() => expect(screen.getByText("1학년부")).toBeDefined());
  });

  it("전체 접기 → 루트만, 전체 펼치기 → 복귀", async () => {
    listMock.mockResolvedValue(flat);
    renderManager();
    await waitFor(() => expect(screen.getByText("1학년부")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "전체 접기" }));
    await waitFor(() => expect(screen.queryByText("1학년부")).toBeNull());
    expect(screen.queryByText("중등부")).toBeNull();
    expect(screen.getByText("학생부")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "전체 펼치기" }));
    await waitFor(() => expect(screen.getByText("1학년부")).toBeDefined());
  });

  it("chevron으로 개별 접기", async () => {
    listMock.mockResolvedValue(flat);
    renderManager();
    await waitFor(() => expect(screen.getByText("중등부")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "중등부 접기" }));
    await waitFor(() => expect(screen.queryByText("1학년부")).toBeNull());
  });

  it("새 부서는 상위 (없음)으로 create 다이얼로그를 연다", async () => {
    listMock.mockResolvedValue(flat);
    renderManager();
    await waitFor(() => expect(screen.getByText("중등부")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "새 부서" }));
    await waitFor(() => expect((screen.getByLabelText("상위 부서") as HTMLSelectElement).value).toBe(""));
  });

  it("노드 ＋하위는 그 부모 id로 프리셋한다", async () => {
    listMock.mockResolvedValue(flat);
    renderManager();
    await waitFor(() => expect(screen.getByText("중등부")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "중등부 하위 추가" }));
    await waitFor(() => expect((screen.getByLabelText("상위 부서") as HTMLSelectElement).value).toBe("2"));
  });

  it("노드 삭제 확인 후 deleteDepartment를 호출한다", async () => {
    listMock.mockResolvedValue(flat);
    deleteMock.mockResolvedValue(undefined);
    renderManager();
    await waitFor(() => expect(screen.getByText("중등부")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "중등부 삭제" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "삭제" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(2));
  });

  it("공개 소개와 별개 데이터라는 안내를 보여준다", async () => {
    listMock.mockResolvedValue([]);
    renderManager();
    await waitFor(() => expect(screen.getByText(/자동 반영되지 않습니다/)).toBeDefined());
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/components/admin/departments/DepartmentManager.test.tsx` (현재 마스터-디테일 구현엔 "전체 접기"/chevron 없음 → 실패).

- [ ] **Step 3: Rewrite implementation (전체 교체)**

`DepartmentManager.tsx` 전체를 다음으로 교체:
```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { adminKeys } from "@/lib/admin/queryKeys";
import { buildDepartmentTree } from "@/lib/api/departments";
import { listDepartmentsAdmin, deleteDepartment } from "@/lib/api/departments.admin";
import { collectCollapsibleIds } from "./treeUtils";
import { DepartmentTree } from "./DepartmentTree";
import { DepartmentFormDialog } from "./DepartmentFormDialog";
import type { DepartmentNode } from "@/lib/api/types";

export function DepartmentManager() {
  const qc = useQueryClient();
  const { data: departments = [], isLoading } = useQuery({
    queryKey: adminKeys.list("departments"),
    queryFn: listDepartmentsAdmin,
  });
  const roots = buildDepartmentTree(departments);

  const [collapsed, setCollapsed] = useState<Set<number>>(new Set()); // 기본 전체 펼침
  const [createParentId, setCreateParentId] = useState<number | null | undefined>(undefined); // undefined=닫힘
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentNode | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => deleteDepartment(id),
    onError: adminOnError(), // 409 DEPARTMENT_HAS_CHILDREN 등은 handleApiError가 토스트 처리
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.list("departments") });
      notify.success("삭제했습니다.");
      setDeleteTarget(null);
    },
  });

  // 개별 노드 접힘 토글(불변 갱신).
  const toggle = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <div className="mt-base flex items-start gap-xs rounded-xl bg-surface-soft p-base">
        <Info size={20} aria-hidden className="mt-xxs shrink-0 text-muted" />
        <p className={cn(typo.bodySm, "text-body")}>
          {"이 화면은 운영용 부서 데이터를 관리합니다. 공개 '교육·부서 소개' 페이지는 별도 콘텐츠로 구성되어 있어, 여기서의 변경이 자동 반영되지 않습니다."}
        </p>
      </div>

      {/* 읽기 폭 캡 — 가운데 빈 갭 제거(R1). 토큰 var 참조라 t-shirt 폭 충돌 회피. */}
      <div className="mt-lg max-w-[var(--container-modal)]">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div className="flex gap-xs">
            <Button type="button" variant="tertiary" onClick={() => setCollapsed(new Set())}>전체 펼치기</Button>
            <Button type="button" variant="tertiary" onClick={() => setCollapsed(collectCollapsibleIds(roots))}>전체 접기</Button>
          </div>
          <Button type="button" variant="primary" onClick={() => setCreateParentId(null)}>새 부서</Button>
        </div>

        <div className="mt-base">
          {isLoading ? (
            <p className={cn(typo.bodyMd, "text-muted")}>불러오는 중…</p>
          ) : (
            <DepartmentTree
              roots={roots}
              collapsed={collapsed}
              onToggle={toggle}
              onCreateChild={(parentId) => setCreateParentId(parentId)}
              onEdit={(id) => setEditId(id)}
              onDelete={(node) => setDeleteTarget(node)}
            />
          )}
        </div>
      </div>

      <DepartmentFormDialog
        open={createParentId !== undefined}
        onOpenChange={(v) => { if (!v) setCreateParentId(undefined); }}
        mode="create"
        defaultParentId={createParentId ?? null}
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
        title={deleteTarget ? `'${deleteTarget.name}' 부서를 삭제할까요?` : "부서를 삭제할까요?"}
        warning="하위 부서가 있으면 삭제할 수 없습니다. 삭제 후 되돌릴 수 없습니다."
        pending={remove.isPending}
        onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id); }}
      />
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/components/admin/departments/DepartmentManager.test.tsx` → PASS (7).

- [ ] **Step 5: Verify** — `npx tsc --noEmit` 무오류 · `./node_modules/.bin/eslint src/components/admin/departments/DepartmentManager.tsx --format json` errorCount 0 (`set-state-in-effect` 없음 — effect 미사용; `max-w-[var(--container-modal)]`는 토큰 참조).

- [ ] **Step 6: Commit** (사용자 요청 시)
```bash
git add src/components/admin/departments/DepartmentManager.tsx src/components/admin/departments/DepartmentManager.test.tsx
git commit -m "feat : 부서 관리 접이식 트리 재작성(접힘 상태·툴바·캡 컬럼) #38"
```

---

## Task 4: 마스터–디테일 잔재 제거

> 사용자 삭제 허락 완료. `DepartmentManager`가 더 이상 import하지 않으므로 안전.

**Files (제거):**
- `src/components/admin/departments/ClusterList.tsx` + `ClusterList.test.tsx`
- `src/components/admin/departments/ClusterDetail.tsx` + `ClusterDetail.test.tsx`

- [ ] **Step 1: 참조 없음 확인**

Run: `grep -rn "ClusterList\|ClusterDetail" src/` → `DepartmentManager.tsx`·`DepartmentManager.test.tsx`에 **남아있지 않아야** 한다(Task 3에서 제거됨). 다른 참조 0건 확인.

- [ ] **Step 2: 파일 삭제(추적 파일이므로 git rm)**

```bash
git rm src/components/admin/departments/ClusterList.tsx \
       src/components/admin/departments/ClusterList.test.tsx \
       src/components/admin/departments/ClusterDetail.tsx \
       src/components/admin/departments/ClusterDetail.test.tsx
```
(커밋은 사용자 요청 시 — `git rm`은 작업트리 삭제 + 삭제 스테이징. Task 사이 커밋 보류 정책상 staged 상태로 둔다.)

- [ ] **Step 3: 게이트로 깨짐 없음 확인**

Run: `npx tsc --noEmit` → No errors.
Run: `npx vitest run src/components/admin/departments/` → 잔존 부서 테스트 전부 PASS, 삭제된 두 컴포넌트 테스트는 더 이상 수집되지 않음.

- [ ] **Step 4: Commit** (사용자 요청 시) — 보통 Task 3와 함께 묶음.

---

## Task 5: DESIGN.md 마커 갱신

**Files:** Modify `.claude/rules/DESIGN.md`

- [ ] **Step 1: 마커 교체**

`department-admin-manager`·`cluster-list`·`cluster-detail` **3줄을 찾아 다음 2줄로 교체**(cluster-* 제거):
```markdown
- **`department-admin-manager`**: 어드민 부서 계층 관리 화면(트랙 04). 공개 `GET /api/departments`(no-store)를 `buildDepartmentTree`로 조립해 **접이식 단일 트리**(`department-tree`)로 표시. 읽기 폭 캡(`max-w-[var(--container-modal)]`) + 전체 펼치기/접기 + 안내 배너(lucide `Info`). 접힘 상태 `Set`. 공개 격리라 ISR revalidate 미사용·어드민 쿼리 캐시만 무효화.
- **`department-tree`**: 접이식 부서 트리(트랙 04). `flattenVisible`로 가시 행만 렌더 — 자식 있는 노드만 chevron(▸/▾, `aria-expanded`), 잎 노드는 동일 폭 스페이서로 정렬, depth 들여쓰기 토큰. 행은 R1(이름·담당 `flex-1 truncate` 좌, 액션 `shrink-0 whitespace-nowrap` 우). 노드별 `＋하위·수정·삭제`(아이콘+`lg:` 텍스트).
```

- [ ] **Step 2: Verify** — `git diff .claude/rules/DESIGN.md`로 3줄→2줄 변경만 확인.

- [ ] **Step 3: Commit** (사용자 요청 시)
```bash
git add .claude/rules/DESIGN.md
git commit -m "docs : 부서 마커 접이식 트리로 갱신(cluster-* 제거) #38"
```

---

## Task 6: 최종 검증

- [ ] **Step 1: 전체 테스트** — `pnpm test` → 전체 PASS(신규 treeUtils +3 · DepartmentTree 5 · Manager 7, 삭제된 Cluster 8개 빠짐).
- [ ] **Step 2: 타입** — `npx tsc --noEmit` → No errors.
- [ ] **Step 3: 린트** — `pnpm lint` → 0 errors(잔여 2 warning은 기존 Bulletin/Event, 무관).
- [ ] **Step 4: 수동** — `pnpm dev` + `DEPT_WRITE` 로그인 → `/mypage/manage/departments`: 캡 컬럼(가운데 갭 없음)·개별/전체 접기·잎 정렬·생성(새 부서=루트 / 노드 ＋하위=프리셋)·수정·삭제(하위 있으면 차단)·모바일 폭(액션 아이콘) 확인.

---

## Self-Review

**1. Spec coverage**: 접이식 트리(Task 2) · 캡 컬럼 R1(Task 2·3) · chevron/잎 정렬(Task 2) · 전체 펼치기/접기(Task 1 util + Task 3) · 노드/툴바 액션·상위 프리셋(Task 2·3) · cluster 제거(Task 4) · DESIGN(Task 5) · 데이터/다이얼로그 재사용(import 구성) — 전부 매핑 ✓

**2. Placeholder scan**: TBD/TODO 없음, 모든 코드 완전 ✓

**3. Type consistency**:
- `VisibleRow`{node·depth·hasChildren} — Task 1 정의 ↔ Task 2 사용 일치 ✓
- `flattenVisible(roots, collapsed)`·`collectCollapsibleIds(roots)` — Task 1 ↔ Task 2·3 일치 ✓
- `DepartmentTreeProps`(roots·collapsed·onToggle·onCreateChild·onEdit·onDelete) — Task 2 정의 ↔ Task 3 사용 일치 ✓
- `collapsed: Set<number>` — Task 3 상태 ↔ Task 2 prop ↔ Task 1 유틸 일치 ✓
- `createParentId: number|null|undefined` · `defaultParentId={createParentId ?? null}` — 기존 다이얼로그 계약과 일치 ✓
