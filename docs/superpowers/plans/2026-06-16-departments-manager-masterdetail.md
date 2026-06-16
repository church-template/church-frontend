# 부서 관리 UI 개편(마스터–디테일) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/mypage/manage/departments`의 부서 트리 표시를 평면 테이블 → 마스터–디테일(클러스터, 데스크톱 2단 / 모바일 드릴인)로 교체해 부서가 많아도 스캔·관리가 쉽게 만든다.

**Architecture:** 표현 계층만 교체한다. 데이터(`departments.admin.ts`)·트리유틸(`treeUtils.ts`)·스키마·`DepartmentFormDialog`(생성 상위 프리셋 prop만 추가)·`DeleteConfirmDialog`는 재사용. `DataTable`은 부서 화면에서 제거. 선택 클러스터는 **파생값**(`roots.find(...) ?? roots[0]`)으로 두어 effect 내 setState를 피한다. 반응형은 Tailwind `lg` + `drilledIn` 불리언 하나.

**Tech Stack:** Next.js(App Router) · TypeScript · TanStack Query · Tailwind v4 · vitest + @testing-library/react · lucide-react

> **커밋 정책(레포 규칙):** 커밋은 **사용자 명시 요청 시에만**. 각 Task의 커밋 스텝은 TDD 절차 표시이며, 최종 기능별로 정리한다. Co-Authored-By·GPG 금지.

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/components/admin/departments/DepartmentFormDialog.tsx` | (변경) 생성 시 상위 프리셋 `defaultParentId` 추가 |
| `src/components/admin/departments/ClusterList.tsx` | (신규) 좌측 레일/모바일 목록 — 루트 + 하위개수 배지 + 선택 + 새 부서 |
| `src/components/admin/departments/ClusterDetail.tsx` | (신규) 우측/모바일 상세 — 클러스터 헤더 + 하위 트리 + 노드/푸터 액션 |
| `src/components/admin/departments/DepartmentManager.tsx` | (재작성) 데이터·선택·반응형·다이얼로그 오케스트레이션 |
| `.claude/rules/DESIGN.md` | (변경) 부서 마커를 마스터–디테일로 갱신 + cluster-list/cluster-detail 추가 |

**무변경 재사용**: `departments.admin.ts` · `treeUtils.ts` · `schema.ts` · `DeleteConfirmDialog` · `adminOnError`·`notify`·`adminKeys`·`buildDepartmentTree`.

**검증 명령**: 단일 `npx vitest run <파일>` · 전체 `pnpm test` · 타입 `npx tsc --noEmit` · 린트 `./node_modules/.bin/eslint <파일>` 또는 `pnpm lint`.

---

## Task 1: DepartmentFormDialog — 생성 상위 프리셋 `defaultParentId`

**Files:**
- Modify: `src/components/admin/departments/DepartmentFormDialog.tsx`
- Test: `src/components/admin/departments/DepartmentFormDialog.test.tsx` (추가)

- [ ] **Step 1: Write the failing test**

`src/components/admin/departments/DepartmentFormDialog.test.tsx`의 마지막 `it(...)` 다음, `});`(describe 닫힘) 직전에 추가:

```typescript
  it("defaultParentId를 주면 create 폼의 상위가 프리셋된다", async () => {
    createMock.mockResolvedValue({ id: 9 });
    renderDialog(
      <DepartmentFormDialog open onOpenChange={() => {}} mode="create" departments={departments} defaultParentId={2} />,
    );
    await waitFor(() =>
      expect((screen.getByLabelText("상위 부서") as HTMLSelectElement).value).toBe("2"),
    );
    fireEvent.change(screen.getByLabelText("부서명"), { target: { value: "1학년부" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ name: "1학년부", parentId: 2 })),
    );
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/departments/DepartmentFormDialog.test.tsx`
Expected: FAIL — 상위 select value가 `""`(프리셋 미적용)이라 `"2"` 단언 실패.

- [ ] **Step 3: Implement — 3곳 수정**

(a) props 인터페이스에 추가 (`DepartmentFormDialogProps` 안, `departments` 줄 아래):
```typescript
  departments: DepartmentCardResponse[]; // 상위 select 옵션 소스(평배열)
  defaultParentId?: number | null; // create 시 상위 프리셋(미지정=null=최상위)
  onSaved?: () => void;
```

(b) 함수 시그니처 구조분해에 `defaultParentId` 추가:
```typescript
export function DepartmentFormDialog({
  open,
  onOpenChange,
  mode,
  editId,
  departments,
  defaultParentId,
  onSaved,
}: DepartmentFormDialogProps) {
```

(c) 시드 effect의 create 분기 + deps:
```typescript
  // 폼 시드: create는 빈 폼(상위는 프리셋), edit는 상세 도착 시 reset. reset()은 RHF API라 effect 내 React setState가 아니다.
  useEffect(() => {
    if (!open) return;
    if (mode === "create") reset({ ...EMPTY, parentId: defaultParentId ?? null });
    else if (detail.data) reset(seedValues(detail.data));
  }, [open, mode, defaultParentId, detail.data, reset]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/departments/DepartmentFormDialog.test.tsx`
Expected: PASS (기존 6 + 신규 1 = 7 tests).

- [ ] **Step 5: Verify lint/types**

Run: `./node_modules/.bin/eslint src/components/admin/departments/DepartmentFormDialog.tsx --format json` → errorCount 0 (특히 `react-hooks/exhaustive-deps` 없음 — `defaultParentId`를 deps에 넣었으므로).
Run: `npx tsc --noEmit` → No errors.

- [ ] **Step 6: Commit** (사용자 요청 시)

```bash
git add src/components/admin/departments/DepartmentFormDialog.tsx src/components/admin/departments/DepartmentFormDialog.test.tsx
git commit -m "feat : 부서 폼 생성 상위 프리셋(defaultParentId) #38"
```

---

## Task 2: ClusterList — 좌측 레일 / 모바일 목록

**Files:**
- Create: `src/components/admin/departments/ClusterList.tsx`
- Test: `src/components/admin/departments/ClusterList.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/departments/ClusterList.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { buildDepartmentTree } from "@/lib/api/departments";
import { ClusterList } from "./ClusterList";

const flat = [
  { id: 1, name: "학생부", leader: "김집사", parentId: null, sortOrder: 10 },
  { id: 2, name: "중등부", leader: "이전도", parentId: 1, sortOrder: 10 },
  { id: 3, name: "고등부", leader: "박전도", parentId: 1, sortOrder: 20 },
  { id: 5, name: "1학년부", leader: "김교사", parentId: 2, sortOrder: 10 },
  { id: 4, name: "청년부", leader: "최목사", parentId: null, sortOrder: 20 },
];
const roots = buildDepartmentTree(flat);

describe("ClusterList", () => {
  it("루트와 하위 개수 배지를 렌더하고 선택을 강조한다", () => {
    render(<ClusterList roots={roots} selectedId={1} onSelect={() => {}} onCreateRoot={() => {}} />);
    expect(screen.getByRole("button", { name: /학생부/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /청년부/ })).toBeDefined();
    expect(screen.getByText("3")).toBeDefined(); // 학생부 하위(중등부·고등부·1학년부)
    expect(screen.getByRole("button", { name: /학생부/ }).getAttribute("aria-current")).toBe("true");
  });

  it("루트 클릭 시 onSelect, 새 부서 클릭 시 onCreateRoot", () => {
    const onSelect = vi.fn();
    const onCreateRoot = vi.fn();
    render(<ClusterList roots={roots} selectedId={1} onSelect={onSelect} onCreateRoot={onCreateRoot} />);
    fireEvent.click(screen.getByRole("button", { name: /청년부/ }));
    expect(onSelect).toHaveBeenCalledWith(4);
    fireEvent.click(screen.getByRole("button", { name: "새 부서" }));
    expect(onCreateRoot).toHaveBeenCalled();
  });

  it("루트가 없으면 안내를 보인다", () => {
    render(<ClusterList roots={[]} selectedId={undefined} onSelect={() => {}} onCreateRoot={() => {}} />);
    expect(screen.getByText("등록된 부서가 없습니다.")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/departments/ClusterList.test.tsx`
Expected: FAIL — `Failed to resolve import "./ClusterList"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/admin/departments/ClusterList.tsx`:

```typescript
"use client";

import { ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { collectDescendantIds } from "./treeUtils";
import type { DepartmentNode } from "@/lib/api/types";

export interface ClusterListProps {
  roots: DepartmentNode[];
  selectedId: number | undefined;
  onSelect: (id: number) => void;
  onCreateRoot: () => void;
}

// 좌측 레일(데스크톱) / 목록(모바일) — 최상위 부서를 '클러스터'로 나열. 하위 개수 배지로 규모를 알린다.
export function ClusterList({ roots, selectedId, onSelect, onCreateRoot }: ClusterListProps) {
  return (
    <div className="flex flex-col gap-xxs">
      <p className={cn(typo.caption, "px-sm uppercase tracking-wide text-muted")}>최상위 부서</p>
      {roots.length === 0 ? (
        <p className={cn(typo.bodySm, "px-sm py-base text-muted")}>등록된 부서가 없습니다.</p>
      ) : (
        roots.map((root) => {
          const count = collectDescendantIds(root).size;
          const active = root.id === selectedId;
          return (
            <button
              key={root.id}
              type="button"
              onClick={() => onSelect(root.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex min-h-12 items-center justify-between gap-xs rounded-lg px-sm py-xs text-left",
                active ? "bg-primary-soft text-primary" : "text-body hover:bg-surface-soft",
              )}
            >
              <span className={cn(typo.bodyMd, "truncate")}>{root.name}</span>
              <span className="flex shrink-0 items-center gap-xxs">
                {count > 0 ? <span className={cn(typo.caption, "text-muted")}>{count}</span> : null}
                <ChevronRight size={16} aria-hidden className="text-muted lg:hidden" />
              </span>
            </button>
          );
        })
      )}
      <button
        type="button"
        onClick={onCreateRoot}
        className={cn(typo.bodySm, "mt-xs flex min-h-12 items-center gap-xxs rounded-lg px-sm py-xs text-primary hover:bg-surface-soft")}
      >
        <Plus size={16} aria-hidden /> 새 부서
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/departments/ClusterList.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Verify lint/types**

Run: `./node_modules/.bin/eslint src/components/admin/departments/ClusterList.tsx --format json` → errorCount 0.
Run: `npx tsc --noEmit` → No errors.

- [ ] **Step 6: Commit** (사용자 요청 시)

```bash
git add src/components/admin/departments/ClusterList.tsx src/components/admin/departments/ClusterList.test.tsx
git commit -m "feat : 부서 클러스터 목록(좌측 레일·하위개수 배지) #38"
```

---

## Task 3: ClusterDetail — 선택 클러스터 상세

**Files:**
- Create: `src/components/admin/departments/ClusterDetail.tsx`
- Test: `src/components/admin/departments/ClusterDetail.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/departments/ClusterDetail.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { buildDepartmentTree } from "@/lib/api/departments";
import { ClusterDetail } from "./ClusterDetail";

const flat = [
  { id: 1, name: "학생부", leader: "김집사", parentId: null, sortOrder: 10 },
  { id: 2, name: "중등부", leader: "이전도", parentId: 1, sortOrder: 10 },
  { id: 3, name: "고등부", leader: "박전도", parentId: 1, sortOrder: 20 },
  { id: 5, name: "1학년부", leader: "김교사", parentId: 2, sortOrder: 10 },
  { id: 4, name: "청년부", leader: "최목사", parentId: null, sortOrder: 20 },
];
const roots = buildDepartmentTree(flat);
const haksaeng = roots.find((r) => r.id === 1)!; // 학생부(하위 있음)
const chungnyeon = roots.find((r) => r.id === 4)!; // 청년부(하위 없음)

function noop() {}

describe("ClusterDetail", () => {
  it("클러스터 헤더와 하위 트리를 들여쓰기로 렌더한다", () => {
    render(<ClusterDetail selected={haksaeng} onBack={noop} onCreateChild={noop} onEdit={noop} onDelete={noop} />);
    expect(screen.getByText("학생부")).toBeDefined(); // 헤더(루트)
    expect(screen.getByText("중등부")).toBeDefined();
    expect(screen.getByText("1학년부")).toBeDefined(); // 깊이 2
    expect(screen.getByText("고등부")).toBeDefined();
  });

  it("노드 ＋하위/수정/삭제와 푸터 하위추가가 올바른 인자로 콜백한다", () => {
    const onCreateChild = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ClusterDetail selected={haksaeng} onBack={noop} onCreateChild={onCreateChild} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "중등부 하위 추가" }));
    expect(onCreateChild).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "중등부 수정" }));
    expect(onEdit).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "중등부 삭제" }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
    fireEvent.click(screen.getByRole("button", { name: "하위 부서 추가" })); // 푸터 = 루트에 추가
    expect(onCreateChild).toHaveBeenCalledWith(1);
  });

  it("헤더(루트)는 수정·삭제만, ＋하위는 없다", () => {
    render(<ClusterDetail selected={haksaeng} onBack={noop} onCreateChild={noop} onEdit={noop} onDelete={noop} />);
    expect(screen.getByRole("button", { name: "학생부 수정" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "학생부 하위 추가" })).toBeNull();
  });

  it("하위가 없으면 안내를 보인다", () => {
    render(<ClusterDetail selected={chungnyeon} onBack={noop} onCreateChild={noop} onEdit={noop} onDelete={noop} />);
    expect(screen.getByText("하위 부서가 없습니다.")).toBeDefined();
  });

  it("선택이 없으면 안내를 보인다", () => {
    render(<ClusterDetail selected={undefined} onBack={noop} onCreateChild={noop} onEdit={noop} onDelete={noop} />);
    expect(screen.getByText("왼쪽에서 부서를 선택하세요.")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/departments/ClusterDetail.test.tsx`
Expected: FAIL — `Failed to resolve import "./ClusterDetail"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/admin/departments/ClusterDetail.tsx`:

```typescript
"use client";

import { ChevronLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { flattenTree } from "./treeUtils";
import type { DepartmentNode } from "@/lib/api/types";

// depth별 좌패딩(spacing 토큰). 클러스터 단위라 짧지만 깊은 가지는 들여쓰기로 표현. 3단↑은 마지막으로 캡.
const INDENT = ["pl-0", "pl-lg", "pl-xxl"];
const indentClass = (depth: number) => INDENT[Math.min(depth, INDENT.length - 1)];
const leaderOf = (node: DepartmentNode) => (node.leader?.trim() ? node.leader : "—");

export interface ClusterDetailProps {
  selected: DepartmentNode | undefined;
  onBack: () => void; // 모바일 드릴인 뒤로
  onCreateChild: (parentId: number) => void;
  onEdit: (id: number) => void;
  onDelete: (node: DepartmentNode) => void;
}

// 노드 액션 — 헤더(루트)는 수정·삭제만, 행은 ＋하위 포함.
function NodeActions({
  node,
  withAddChild,
  onCreateChild,
  onEdit,
  onDelete,
}: {
  node: DepartmentNode;
  withAddChild: boolean;
  onCreateChild: (parentId: number) => void;
  onEdit: (id: number) => void;
  onDelete: (node: DepartmentNode) => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-xxs">
      {withAddChild ? (
        <Button type="button" variant="tertiary" onClick={() => onCreateChild(node.id)} aria-label={`${node.name} 하위 추가`}>
          <Plus size={18} aria-hidden />
        </Button>
      ) : null}
      <Button type="button" variant="tertiary" onClick={() => onEdit(node.id)} aria-label={`${node.name} 수정`}>
        <Pencil size={18} aria-hidden />
      </Button>
      <Button type="button" variant="tertiary" onClick={() => onDelete(node)} aria-label={`${node.name} 삭제`}>
        <Trash2 size={18} aria-hidden />
      </Button>
    </span>
  );
}

// 우측 패널(데스크톱) / 상세(모바일) — 선택 클러스터의 루트 헤더 + 하위 트리.
export function ClusterDetail({ selected, onBack, onCreateChild, onEdit, onDelete }: ClusterDetailProps) {
  if (!selected) {
    return <p className={cn(typo.bodyMd, "py-section text-center text-muted")}>왼쪽에서 부서를 선택하세요.</p>;
  }
  const rows = flattenTree(selected.children);
  return (
    <div className="flex flex-col gap-base">
      <button
        type="button"
        onClick={onBack}
        className={cn(typo.bodySm, "flex items-center gap-xxs self-start text-primary lg:hidden")}
      >
        <ChevronLeft size={18} aria-hidden /> 부서 목록
      </button>

      <div className="flex items-center justify-between gap-sm border-b border-hairline pb-sm">
        <span className="min-w-0 truncate">
          <span className={cn(typo.titleMd, "text-ink")}>{selected.name}</span>
          <span className={cn(typo.bodySm, "ml-xs text-muted")}>· 인도자 {leaderOf(selected)}</span>
        </span>
        <NodeActions node={selected} withAddChild={false} onCreateChild={onCreateChild} onEdit={onEdit} onDelete={onDelete} />
      </div>

      {rows.length === 0 ? (
        <p className={cn(typo.bodySm, "text-muted")}>하위 부서가 없습니다.</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map(({ node, depth }) => (
            <li key={node.id} className="flex items-center justify-between gap-sm border-b border-hairline py-sm">
              <span className={cn("flex min-w-0 items-center", indentClass(depth))}>
                {depth > 0 ? <span aria-hidden className="mr-xxs text-muted">└</span> : null}
                <span className={cn(typo.bodyMd, "truncate text-ink")}>{node.name}</span>
                <span className={cn(typo.bodySm, "ml-xs shrink-0 text-muted")}>· {leaderOf(node)}</span>
              </span>
              <NodeActions node={node} withAddChild onCreateChild={onCreateChild} onEdit={onEdit} onDelete={onDelete} />
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="tertiary" onClick={() => onCreateChild(selected.id)} className="self-start">
        <Plus size={18} aria-hidden /> 하위 부서 추가
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/departments/ClusterDetail.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Verify lint/types**

Run: `./node_modules/.bin/eslint src/components/admin/departments/ClusterDetail.tsx --format json` → errorCount 0.
Run: `npx tsc --noEmit` → No errors.

- [ ] **Step 6: Commit** (사용자 요청 시)

```bash
git add src/components/admin/departments/ClusterDetail.tsx src/components/admin/departments/ClusterDetail.test.tsx
git commit -m "feat : 부서 클러스터 상세(헤더·하위 트리·노드 액션) #38"
```

---

## Task 4: DepartmentManager 재작성 — 오케스트레이션·반응형

**Files:**
- Rewrite: `src/components/admin/departments/DepartmentManager.tsx`
- Rewrite: `src/components/admin/departments/DepartmentManager.test.tsx`

- [ ] **Step 1: Write the failing test (전체 교체)**

`src/components/admin/departments/DepartmentManager.test.tsx` 전체를 아래로 교체:

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

describe("DepartmentManager (master-detail)", () => {
  it("기본으로 첫 루트가 선택되어 그 하위가 상세에 보인다", async () => {
    listMock.mockResolvedValue(flat);
    renderManager();
    // 첫 루트 = 학생부 → 상세에 하위 중등부/고등부
    await waitFor(() => expect(screen.getByText("중등부")).toBeDefined());
    expect(screen.getByText("고등부")).toBeDefined();
  });

  it("다른 루트를 선택하면 그 상세로 바뀐다", async () => {
    listMock.mockResolvedValue(flat);
    renderManager();
    await waitFor(() => expect(screen.getByText("중등부")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /청년부/ }));
    // 청년부는 하위 없음 → 안내, 중등부는 사라짐
    await waitFor(() => expect(screen.getByText("하위 부서가 없습니다.")).toBeDefined());
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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/departments/DepartmentManager.test.tsx`
Expected: FAIL — 현재 구현은 `새 부서`·`중등부 하위 추가` 버튼/마스터-디테일 구조가 없어 단언 실패.

- [ ] **Step 3: Rewrite implementation (전체 교체)**

`src/components/admin/departments/DepartmentManager.tsx` 전체를 아래로 교체:

```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { adminKeys } from "@/lib/admin/queryKeys";
import { buildDepartmentTree } from "@/lib/api/departments";
import { listDepartmentsAdmin, deleteDepartment } from "@/lib/api/departments.admin";
import { ClusterList } from "./ClusterList";
import { ClusterDetail } from "./ClusterDetail";
import { DepartmentFormDialog } from "./DepartmentFormDialog";
import type { DepartmentNode } from "@/lib/api/types";

export function DepartmentManager() {
  const qc = useQueryClient();
  const { data: departments = [], isLoading } = useQuery({
    queryKey: adminKeys.list("departments"),
    queryFn: listDepartmentsAdmin,
  });
  const roots = buildDepartmentTree(departments);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drilledIn, setDrilledIn] = useState(false); // 모바일 전용: 상세 진입 여부
  const [createParentId, setCreateParentId] = useState<number | null | undefined>(undefined); // undefined=닫힘
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentNode | null>(null);

  // 선택 클러스터는 파생값(effect 내 setState 금지): 명시 선택 → 없거나 삭제되면 첫 루트로 폴백.
  const selected = roots.find((r) => r.id === selectedId) ?? roots[0];

  const remove = useMutation({
    mutationFn: (id: number) => deleteDepartment(id),
    onError: adminOnError(), // 409 DEPARTMENT_HAS_CHILDREN 등은 handleApiError가 토스트 처리
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.list("departments") });
      notify.success("삭제했습니다.");
      setDeleteTarget(null);
    },
  });

  const selectCluster = (id: number) => {
    setSelectedId(id);
    setDrilledIn(true); // 모바일에서 상세로 진입(데스크톱은 무해)
  };

  return (
    <>
      <div className="mt-base flex items-start gap-xs rounded-xl bg-surface-soft p-base">
        <Info size={20} aria-hidden className="mt-xxs shrink-0 text-muted" />
        <p className={cn(typo.bodySm, "text-body")}>
          {"이 화면은 운영용 부서 데이터를 관리합니다. 공개 '교육·부서 소개' 페이지는 별도 콘텐츠로 구성되어 있어, 여기서의 변경이 자동 반영되지 않습니다."}
        </p>
      </div>

      {isLoading ? (
        <p className={cn(typo.bodyMd, "mt-lg text-muted")}>불러오는 중…</p>
      ) : (
        <div className="mt-lg flex flex-col gap-lg lg:flex-row">
          <div className={cn("lg:block lg:w-1/3 lg:shrink-0", drilledIn ? "hidden" : "block")}>
            <ClusterList
              roots={roots}
              selectedId={selected?.id}
              onSelect={selectCluster}
              onCreateRoot={() => setCreateParentId(null)}
            />
          </div>
          <div className={cn("min-w-0 flex-1 lg:block", drilledIn ? "block" : "hidden")}>
            <ClusterDetail
              selected={selected}
              onBack={() => setDrilledIn(false)}
              onCreateChild={(parentId) => setCreateParentId(parentId)}
              onEdit={(id) => setEditId(id)}
              onDelete={(node) => setDeleteTarget(node)}
            />
          </div>
        </div>
      )}

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/departments/DepartmentManager.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Verify lint/types**

Run: `./node_modules/.bin/eslint src/components/admin/departments/DepartmentManager.tsx --format json` → errorCount 0 (`set-state-in-effect` 없음 — 선택은 파생값).
Run: `npx tsc --noEmit` → No errors.

- [ ] **Step 6: Commit** (사용자 요청 시)

```bash
git add src/components/admin/departments/DepartmentManager.tsx src/components/admin/departments/DepartmentManager.test.tsx
git commit -m "feat : 부서 관리 마스터-디테일 재작성(클러스터·반응형 드릴인) #38"
```

---

## Task 5: DESIGN.md 마커 갱신 + 최종 검증

**Files:**
- Modify: `.claude/rules/DESIGN.md`

- [ ] **Step 1: 마커 갱신**

`.claude/rules/DESIGN.md`에서 기존 `department-admin-manager` 줄을 찾아 그 줄을 아래로 **교체**하고, 바로 아래에 두 줄을 **추가**한다(다른 마커 라인은 건드리지 않는다):

기존(교체 대상):
```markdown
- **`department-admin-manager`**: 어드민 부서 계층 관리 화면(트랙 04). 공개 `GET /api/departments`(no-store)를 `buildDepartmentTree`로 조립해 들여쓰기 평면 `admin-data-table`로 표시(정렬순서 컬럼 `hidden sm:table-cell`), 행별 수정·삭제(`DeleteConfirmDialog`), 공개 소개와 별개 데이터 안내 배너(lucide `Info`). 공개 격리라 ISR revalidate 미사용·어드민 쿼리 캐시만 무효화.
```

교체 후(3줄):
```markdown
- **`department-admin-manager`**: 어드민 부서 계층 관리 화면(트랙 04). 공개 `GET /api/departments`(no-store)를 `buildDepartmentTree`로 조립해 **마스터–디테일**로 표시 — 데스크톱(≥lg) 2단 / 모바일 드릴인. 선택 클러스터는 파생값(`roots.find ?? roots[0]`). 공개 격리라 ISR revalidate 미사용·어드민 쿼리 캐시만 무효화. 안내 배너(lucide `Info`).
- **`cluster-list`**: 좌측 레일/모바일 목록(트랙 04). 최상위 부서(클러스터)를 하위 개수 배지와 함께 나열, 선택 강조 `bg-primary-soft`/`text-primary`, `＋새 부서`. 모바일은 `ChevronRight`로 드릴인 암시.
- **`cluster-detail`**: 우측/모바일 상세(트랙 04). 선택 클러스터 헤더(이름·담당·수정·삭제) + 하위 트리(들여쓰기 토큰) + 노드별 `＋하위·수정·삭제` + 푸터 `＋하위 부서 추가`. 모바일 `‹부서 목록` 뒤로.
```

- [ ] **Step 2: Verify**

Run: `git diff .claude/rules/DESIGN.md`
Expected: `department-admin-manager` 1줄 → 3줄로 변경(다른 변경 없음).

- [ ] **Step 3: 전체 게이트**

Run: `pnpm test` → 전체 PASS (신규 ClusterList 3 + ClusterDetail 5 + Manager 6 + Dialog +1 포함).
Run: `npx tsc --noEmit` → No errors.
Run: `pnpm lint` → 0 errors (잔여 2 warning은 기존 Bulletin/Event, 무관).

- [ ] **Step 4: 수동 반응형 확인**

`pnpm dev` + `DEPT_WRITE` 로그인 → `/mypage/manage/departments`:
- 데스크톱(≥1024px): 좌 클러스터 / 우 상세 2단 동시. 루트 클릭 시 우측 전환.
- 모바일(<1024px, 개발자도구): 목록만 → 루트 탭 → 상세 + `‹부서 목록` 뒤로.
- 생성(새 부서=최상위 / 노드 ＋하위=프리셋) · 수정 · 삭제(하위 있으면 차단 토스트) 동작.

- [ ] **Step 5: Commit** (사용자 요청 시)

```bash
git add .claude/rules/DESIGN.md docs/superpowers/specs/2026-06-16-departments-manager-masterdetail-design.md docs/superpowers/plans/2026-06-16-departments-manager-masterdetail.md
git commit -m "docs : 부서 관리 마스터-디테일 UI 설계·계획 + DESIGN 마커 #38"
```

---

## Self-Review

**1. Spec coverage** (스펙 대비)
- 데스크톱 2단 / 모바일 드릴인 → Task 4 반응형(`lg` + `drilledIn`) ✓
- 클러스터 목록 + 하위개수 배지 + 새 부서 → Task 2 ClusterList ✓
- 클러스터 상세(헤더·하위 트리·노드 액션·푸터) → Task 3 ClusterDetail ✓
- 상위 프리셋(새 부서=null / ＋하위=노드) → Task 1 defaultParentId + Task 4 배선 ✓
- 선택 파생값·삭제 폴백 → Task 4 `roots.find ?? roots[0]` ✓
- 데이터/다이얼로그/유틸 재사용·DataTable 제거 → Task 4 import 구성 ✓
- 검색 제외(비목표) → 어디에도 없음 ✓
- DESIGN 마커 → Task 5 ✓

**2. Placeholder scan**: TBD/TODO 없음. 모든 코드 스텝에 완전한 코드 포함 ✓

**3. Type consistency**:
- `ClusterListProps`(roots·selectedId·onSelect·onCreateRoot) — Task 2 정의 ↔ Task 4 사용 일치 ✓
- `ClusterDetailProps`(selected·onBack·onCreateChild·onEdit·onDelete) — Task 3 정의 ↔ Task 4 사용 일치 ✓
- `defaultParentId?: number | null` — Task 1 정의 ↔ Task 4 사용 일치 ✓
- `DepartmentNode`·`flattenTree`·`collectDescendantIds`·`buildDepartmentTree` — 기존 export 재사용, 시그니처 일치 ✓
- `onCreateChild(parentId: number)` — ClusterDetail에서 항상 number 전달, Manager `setCreateParentId(number)` ✓
- `createParentId: number | null | undefined` — undefined=닫힘, null=루트, number=자식. `open={createParentId !== undefined}`·`defaultParentId={createParentId ?? null}` 일치 ✓
