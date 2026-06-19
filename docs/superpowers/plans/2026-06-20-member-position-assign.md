# 회원 직분 부여/변경/해제 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 어드민 회원 상세 다이얼로그에서 회원의 직분을 부여·변경·해제할 수 있게 한다.

**Architecture:** 신규 백엔드 엔드포인트(`PUT /api/admin/members/{uuid}/position`)를 호출하는 API 클라이언트 함수를 추가하고, 역할 섹션(`MemberRolesSection`)과 동형의 전용 '직분' 섹션 컴포넌트를 만들어 `MemberDetailDialog`에 조립한다. 직분 카탈로그(`["positions"]`)는 이름→id 매핑에 쓰고, 현재값 시드는 keyed 마운트로 초기화한다.

**Tech Stack:** Next.js(App Router) · TypeScript · TanStack Query · vitest(globals:false) · Tailwind 토큰

## Global Constraints

- 패키지 매니저 **pnpm**. 테스트: `pnpm test`(vitest).
- 테스트는 `globals: false` — `vitest`에서 `describe/it/expect/vi` 명시 import. jest-dom 미사용(`toBeDefined`/`getAttribute`/`.disabled` 직접 검사).
- 쓰기 API는 `apiMutate`(client 전용), 읽기는 `authFetch`+`parseJson`. `members.admin.ts`는 client 전용(RSC 번들 금지).
- 커밋 메시지 끝에 이슈 태그 `#57` 필수. 형식: `<type> : <설명> #57`. Co-Authored-By 금지.
- hex·px 인라인 금지(토큰 참조), `typo.*` 사용, JSX 조건부는 삼항(`{cond ? <X/> : null}`).
- 직분은 권한과 무관 — 위계 검증 없음. 게이트는 `MEMBER_MANAGE`. 자기수정 허용(isSelf 차단 없음).

---

### Task 1: API 클라이언트 — `changePosition`

**Files:**
- Modify: `src/lib/api/members.admin.ts` (역할 함수 옆에 추가)
- Test: `src/lib/api/members.admin.test.ts` (기존 파일에 케이스 추가)

**Interfaces:**
- Consumes: `apiMutate<T>(path, { method, body })` (기존), `MemberDetailResponse` (기존 export)
- Produces: `changePosition(uuid: string, positionId: number | null): Promise<MemberDetailResponse>`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/api/members.admin.test.ts`의 import 줄에 `changePosition`을 추가한다:

```ts
import { listMembers, getMember, updateMember, grantRole, revokeRole, resetPassword, changePosition } from "./members.admin";
```

그리고 `resetPassword` 테스트 다음, `describe` 블록 닫기 전에 케이스 2개를 추가한다:

```ts
  it("changePosition는 PUT .../position {positionId} 로 부여한다", async () => {
    apiMutateMock.mockResolvedValue({ uuid: "u1", position: "목사" });
    await changePosition("u1", 3);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/members/u1/position", { method: "PUT", body: { positionId: 3 } });
  });
  it("changePosition는 positionId=null 로 해제한다", async () => {
    apiMutateMock.mockResolvedValue({ uuid: "u1", position: "" });
    await changePosition("u1", null);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/members/u1/position", { method: "PUT", body: { positionId: null } });
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/lib/api/members.admin.test.ts`
Expected: FAIL — `changePosition is not a function` (또는 import 에러)

- [ ] **Step 3: 최소 구현**

`src/lib/api/members.admin.ts`의 `revokeRole` 함수 바로 아래에 추가한다:

```ts
// 직분 부여/변경/해제 — PUT .../position. positionId=null이면 해제(스펙: 위계 검증 없음).
export function changePosition(uuid: string, positionId: number | null): Promise<MemberDetailResponse> {
  return apiMutate<MemberDetailResponse>(`/api/admin/members/${uuid}/position`, { method: "PUT", body: { positionId } });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/lib/api/members.admin.test.ts`
Expected: PASS (전 케이스)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/api/members.admin.ts src/lib/api/members.admin.test.ts
git commit -m "feat : 회원 직분 부여 API changePosition 추가 #57"
```

---

### Task 2: 직분 섹션 컴포넌트 + 다이얼로그 조립

**Files:**
- Create: `src/components/admin/members/MemberPositionSection.tsx`
- Test: `src/components/admin/members/MemberPositionSection.test.tsx`
- Modify: `src/components/admin/members/MemberDetailDialog.tsx` (역할 섹션 다음에 삽입)

**Interfaces:**
- Consumes:
  - `changePosition(uuid, positionId): Promise<MemberDetailResponse>` (Task 1)
  - `getPositions(): Promise<PositionResponse[]>` from `@/lib/api/positions` — `PositionResponse` = `{ id: number; name: string; sortOrder: number; createdAt: string }`
  - `useHasPermission(perm): boolean` from `@/lib/auth/useMe`
  - `adminKeys.detail("members", uuid)` / 목록 키 `["admin","members","list"]`
  - `MemberDetailResponse` (기존, `position`은 직분 **이름 문자열**)
- Produces: `MemberPositionSection({ member }: { member: MemberDetailResponse })` — named export

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/admin/members/MemberPositionSection.test.tsx` 생성:

```tsx
// src/components/admin/members/MemberPositionSection.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getPositionsMock, changeMock, useHasPermMock, notifySuccess } = vi.hoisted(() => ({
  getPositionsMock: vi.fn(), changeMock: vi.fn(), useHasPermMock: vi.fn(), notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/positions", () => ({ getPositions: getPositionsMock }));
vi.mock("@/lib/api/members.admin", () => ({ changePosition: changeMock }));
vi.mock("@/lib/auth/useMe", () => ({ useHasPermission: useHasPermMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));

import { MemberPositionSection } from "./MemberPositionSection";

const positions = [
  { id: 1, name: "목사", sortOrder: 10, createdAt: "2026-01-01T00:00:00" },
  { id: 2, name: "장로", sortOrder: 20, createdAt: "2026-01-01T00:00:00" },
];
const base = { uuid: "u1", name: "홍길동", phone: "", email: "", position: "목사", roles: [], permissions: [], approved: true, termsAgreed: true, privacyAgreed: true, agreedAt: null, createdAt: "2026-01-01T00:00:00" };

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useHasPermMock.mockReturnValue(true);
  getPositionsMock.mockResolvedValue(positions);
});
afterEach(() => vi.clearAllMocks());
const renderSection = (m = base) => render(<QueryClientProvider client={qc}><MemberPositionSection member={m} /></QueryClientProvider>);

describe("MemberPositionSection", () => {
  it("현재 직분이 select에 시드된다", async () => {
    renderSection();
    await waitFor(() => expect((screen.getByLabelText("직분 선택") as HTMLSelectElement).value).toBe("1"));
  });
  it("다른 직분 선택 후 변경 → changePosition(uuid, id) 호출", async () => {
    changeMock.mockResolvedValue({ ...base, position: "장로" });
    renderSection();
    await waitFor(() => expect((screen.getByLabelText("직분 선택") as HTMLSelectElement).value).toBe("1"));
    fireEvent.change(screen.getByLabelText("직분 선택"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "변경" }));
    await waitFor(() => expect(changeMock).toHaveBeenCalledWith("u1", 2));
  });
  it("(없음) 선택 후 변경 → changePosition(uuid, null)로 해제", async () => {
    changeMock.mockResolvedValue({ ...base, position: "" });
    renderSection();
    await waitFor(() => expect((screen.getByLabelText("직분 선택") as HTMLSelectElement).value).toBe("1"));
    fireEvent.change(screen.getByLabelText("직분 선택"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "변경" }));
    await waitFor(() => expect(changeMock).toHaveBeenCalledWith("u1", null));
  });
  it("MEMBER_MANAGE 미보유면 select 비노출, 직분 이름만 표시", async () => {
    useHasPermMock.mockReturnValue(false);
    renderSection();
    await waitFor(() => expect(screen.getByText("목사")).toBeDefined());
    expect(screen.queryByLabelText("직분 선택")).toBeNull();
  });
  it("카탈로그에 없는 직분이면 (없음)으로 폴백", async () => {
    renderSection({ ...base, position: "권사" }); // positions에 없음
    await waitFor(() => expect((screen.getByLabelText("직분 선택") as HTMLSelectElement).value).toBe(""));
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/components/admin/members/MemberPositionSection.test.tsx`
Expected: FAIL — `Failed to resolve import "./MemberPositionSection"` (파일 없음)

- [ ] **Step 3: 컴포넌트 구현**

`src/components/admin/members/MemberPositionSection.tsx` 생성:

```tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { adminKeys } from "@/lib/admin/queryKeys";
import { notify } from "@/lib/notify";
import { useHasPermission } from "@/lib/auth/useMe";
import { getPositions } from "@/lib/api/positions";
import { changePosition, type MemberDetailResponse } from "@/lib/api/members.admin";
import type { PositionResponse } from "@/lib/api/types";

export function MemberPositionSection({ member }: { member: MemberDetailResponse }) {
  const canManage = useHasPermission("MEMBER_MANAGE");
  // 공개 카탈로그 — PositionManager와 ["positions"] 키 공유
  const { data: positions = [] } = useQuery({ queryKey: ["positions"], queryFn: getPositions });
  // 현재 직분은 이름 문자열 → 카탈로그에서 id 역매핑(없으면 null = (없음) 폴백)
  const currentId = positions.find((p) => p.name === member.position)?.id ?? null;

  return (
    <section className="flex flex-col gap-sm">
      <h3 className={cn(typo.titleSm, "text-ink")}>직분</h3>
      {canManage ? (
        // keyed 마운트로 현재값 시드(set-state-in-effect 회피). 변경 성공 시 currentId 갱신→remount.
        <PositionEditor
          key={`${member.uuid}:${currentId ?? "none"}`}
          uuid={member.uuid}
          currentId={currentId}
          positions={positions}
        />
      ) : (
        <span className={cn(typo.bodySm, "text-muted")}>{member.position ? member.position : "직분 없음"}</span>
      )}
    </section>
  );
}

function PositionEditor({ uuid, currentId, positions }: { uuid: string; currentId: number | null; positions: PositionResponse[] }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<number | "">(currentId ?? "");

  const change = useMutation({
    mutationFn: (positionId: number | null) => changePosition(uuid, positionId),
    onError: adminOnError(),
    onSuccess: (updated) => {
      qc.setQueryData(adminKeys.detail("members", uuid), updated);
      qc.invalidateQueries({ queryKey: ["admin", "members", "list"] });
      notify.success("직분을 변경했습니다.");
    },
  });

  // 현재값과 동일하면 변경 비활성("" ↔ null 동일 취급)
  const unchanged = selected === (currentId ?? "");

  return (
    <div className="flex items-center gap-xs">
      <select
        aria-label="직분 선택"
        value={selected === "" ? "" : String(selected)}
        onChange={(e) => setSelected(e.target.value === "" ? "" : Number(e.target.value))}
        className={cn(
          typo.bodyMd,
          "h-12 rounded-md border border-hairline bg-canvas px-4 text-ink outline-hidden",
          "focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary",
        )}
      >
        <option value="">(없음)</option>
        {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <Button
        type="button"
        variant="secondary"
        loading={change.isPending}
        disabled={unchanged}
        onClick={() => change.mutate(selected === "" ? null : (selected as number))}
      >변경</Button>
    </div>
  );
}
```

- [ ] **Step 4: 컴포넌트 테스트 통과 확인**

Run: `pnpm test src/components/admin/members/MemberPositionSection.test.tsx`
Expected: PASS (5 케이스)

- [ ] **Step 5: 다이얼로그에 조립**

`src/components/admin/members/MemberDetailDialog.tsx` 수정.

import 추가(다른 섹션 import 옆):

```tsx
import { MemberPositionSection } from "./MemberPositionSection";
```

역할 섹션 블록 다음에 헤어라인 + 직분 섹션을 삽입한다. 아래 기존 코드:

```tsx
            <MemberRolesSection member={m} />
            <hr className="border-0 border-t border-hairline" aria-hidden />
            <section className="flex flex-col gap-xs">
              <h3 className={cn(typo.titleSm, "text-ink")}>약관 동의</h3>
```

을 다음으로 바꾼다:

```tsx
            <MemberRolesSection member={m} />
            <hr className="border-0 border-t border-hairline" aria-hidden />
            <MemberPositionSection member={m} />
            <hr className="border-0 border-t border-hairline" aria-hidden />
            <section className="flex flex-col gap-xs">
              <h3 className={cn(typo.titleSm, "text-ink")}>약관 동의</h3>
```

- [ ] **Step 6: 린트 + 전체 테스트 확인**

Run: `pnpm lint`
Expected: 에러 없음 (특히 set-state-in-effect 없음)

Run: `pnpm test src/components/admin/members`
Expected: PASS (직분 섹션 + 기존 회원 섹션 전부)

- [ ] **Step 7: 커밋**

```bash
git add src/components/admin/members/MemberPositionSection.tsx src/components/admin/members/MemberPositionSection.test.tsx src/components/admin/members/MemberDetailDialog.tsx
git commit -m "feat : 회원 상세 직분 부여/변경/해제 섹션 추가 #57"
```

---

## 자체 검토 메모

- 스펙 커버리지: API(`changePosition`)=Task 1, 전용 직분 섹션·게이트·자기수정 허용·이름→id 매핑·엣지 케이스(빈 직분·삭제된 직분·해제)=Task 2, 다이얼로그 조립=Task 2 Step 5. 테스트 5종 모두 Task 2에 포함.
- 타입 일관성: `changePosition(uuid, positionId)` 시그니처가 Task 1 정의와 Task 2 소비처에서 동일. `PositionResponse`는 `@/lib/api/types`에서 import.
- 플레이스홀더 없음: 모든 코드 블록 완전체.
