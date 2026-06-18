# 어드민 06 태그·직분 관리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영자가 마이페이지 관리 허브에서 전역 태그와 직분(표시용 레이블)을 추가·수정·삭제하는 어드민 화면 2종을 구현한다.

**Architecture:** 도메인별 자립 컴포넌트(부서 04 선례). 공용 primitive(`DataTable`·`DeleteConfirmDialog`·`apiMutate`·`adminOnError`) 재사용. 태그·직분 모두 `version`·단건 GET이 없어 수정 시드는 목록 행 값으로 직접 처리(부서의 version 시드 로직 불필요). 태그는 공개 ISR(`getTags`)을 공유하므로 `["tags"]` 쿼리키 + `revalidateTags()`로 무효화; 직분은 공개 소비자가 없어 클라 쿼리만 무효화.

**Tech Stack:** Next.js(App Router)·TypeScript·TanStack Query·react-hook-form+zod(v4)·Tailwind 토큰·vitest+@testing-library/react·pnpm.

**Spec:** `docs/superpowers/specs/2026-06-17-admin-taxonomy-design.md`

---

## 커밋 정책 (프로젝트 규칙 우선)

- 이 프로젝트는 **커밋·push를 명시 요청 시에만** 한다. **각 Task 뒤에 커밋하지 않는다.**
- 커밋은 아래 **6개 기능 그룹 경계**에서만, **사용자 승인 후** 수행한다(메시지 제안 포함). 마이크로 커밋이 쌓였으면 `reset --soft`로 그룹 단위 squash.
- Co-Authored-By 태그 금지.

| 그룹 | Task | 제안 커밋 메시지 |
|---|---|---|
| G1 데이터 계층 | 1–5 | `feat: 태그·직분 어드민 API 계층(읽기·쓰기·태그 무효화) #41` |
| G2 스키마 | 6–7 | `feat: 태그·직분 폼 zod 스키마 #41` |
| G3 태그 UI | 8–9 | `feat: 태그 관리 화면(목록·CRUD) #41` |
| G4 직분 UI | 10–11 | `feat: 직분 관리 화면(목록·CRUD·정렬순서) #41` |
| G5 라우트 | 12–13 | `feat: 태그·직분 관리 라우트 게이트 #41` |
| G6 문서 | 14 | `docs: DESIGN.md 태그·직분 어드민 컴포넌트 등록 #41` |

> 이슈 번호(#41)는 트랙 06에 해당. 실제 번호는 커밋 시 확인.

---

## File Structure

**데이터 계층**
- `src/lib/api/types.ts` (수정) — `PositionResponse` 추가.
- `src/lib/api/tags.ts` (수정) — `getTags` fetch에 `tags:["tags"]` 부착.
- `src/lib/api/positions.ts` (신규) — `getPositions`(공개 읽기, 클라 useQuery 전용).
- `src/lib/api/tags.admin.ts` (신규) — `createTag`·`patchTag`·`deleteTag`.
- `src/lib/api/positions.admin.ts` (신규) — `createPosition`·`patchPosition`·`deletePosition`.
- `src/lib/admin/revalidate.ts` (수정) — `revalidateTags` 추가.

**스키마·컴포넌트**
- `src/components/admin/tags/schema.ts` · `TagFormDialog.tsx` · `TagManager.tsx` (신규)
- `src/components/admin/positions/schema.ts` · `PositionFormDialog.tsx` · `PositionManager.tsx` (신규)

**라우트**
- `src/app/(site)/mypage/manage/tags/page.tsx` · `positions/page.tsx` (신규)

**문서**
- `.claude/rules/DESIGN.md` (수정) — 어드민 공용 블록 06 구획.

**테스트**(코로케이션): 각 `*.test.ts(x)` — Task별 명시.

---

## Task 1: 직분 타입 + 공개 읽기 (`positions.ts`)

**Files:**
- Modify: `src/lib/api/types.ts` (끝에 추가)
- Create: `src/lib/api/positions.ts`
- Test: `src/lib/api/positions.test.ts`

- [ ] **Step 1: 실패 테스트 작성** — `src/lib/api/positions.test.ts`

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { getPositions } from "./positions";

afterEach(() => vi.unstubAllGlobals());

describe("getPositions", () => {
  it("'/api/positions'를 호출하고 평배열 반환", async () => {
    const positions = [{ id: 1, name: "목사", sortOrder: 10, createdAt: "2026-06-17T00:00:00" }];
    const spy = vi.fn(async () => ({ ok: true, json: async () => positions }) as Response);
    vi.stubGlobal("fetch", spy);
    expect(await getPositions()).toEqual(positions);
    expect(spy).toHaveBeenCalledWith("/api/positions");
  });
  it("비 200이면 throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    await expect(getPositions()).rejects.toThrow("GET /api/positions 실패: 500");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/lib/api/positions.test.ts`
Expected: FAIL — `getPositions` / `./positions` 모듈 없음.

- [ ] **Step 3: 타입 추가** — `src/lib/api/types.ts` 파일 끝에 추가

```ts
export interface PositionResponse {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: string; // ISO. 화면 미표시(정렬·진단용)
}
```

- [ ] **Step 4: 구현** — `src/lib/api/positions.ts`

```ts
import { apiUrl } from "@/lib/auth/apiBase";
import type { PositionResponse } from "./types";

// 직분 목록(공개, 비페이징 평배열, sortOrder 오름차순). 클라 useQuery 전용 — RSC에서 import 금지.
export async function getPositions(): Promise<PositionResponse[]> {
  const res = await fetch(apiUrl("/api/positions"));
  if (!res.ok) throw new Error(`GET /api/positions 실패: ${res.status}`);
  return (await res.json()) as PositionResponse[];
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm vitest run src/lib/api/positions.test.ts`
Expected: PASS (2 tests).

---

## Task 2: 태그 공개 읽기 무효화 태깅 (`tags.ts`)

**Files:**
- Modify: `src/lib/api/tags.ts:6`
- Test: `src/lib/api/tags.test.ts:12` (**기존 단언 수정**)

- [ ] **Step 1: 기존 테스트 단언 수정** — `src/lib/api/tags.test.ts`

기존 12번째 줄
```ts
    expect(spy).toHaveBeenCalledWith("/api/tags", { next: { revalidate: 300 } });
```
을 다음으로 교체:
```ts
    expect(spy).toHaveBeenCalledWith("/api/tags", { next: { revalidate: 300, tags: ["tags"] } });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/lib/api/tags.test.ts`
Expected: FAIL — 호출 인자 불일치(아직 `tags:["tags"]` 미부착).

- [ ] **Step 3: 구현** — `src/lib/api/tags.ts:6`

기존
```ts
  const res = await fetch(apiUrl("/api/tags"), { next: { revalidate: 300 } });
```
을 다음으로 교체:
```ts
  const res = await fetch(apiUrl("/api/tags"), { next: { revalidate: 300, tags: ["tags"] } });
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run src/lib/api/tags.test.ts`
Expected: PASS (2 tests).

---

## Task 3: 태그 ISR 무효화 함수 (`revalidate.ts`)

**Files:**
- Modify: `src/lib/admin/revalidate.ts` (끝에 추가)

> `revalidate.ts`는 `"use server"` 서버 액션 모듈. 기존 4개 함수(`revalidateEvents` 등)와 동형. 단위 테스트 없음(선례 동일) — 소비측(Task 9) 테스트에서 mock으로 검증.

- [ ] **Step 1: 구현** — `src/lib/admin/revalidate.ts` 파일 끝에 추가

```ts
export async function revalidateTags() {
  updateTag("tags");
}
```

- [ ] **Step 2: 타입체크 확인**

Run: `npx tsc --noEmit`
Expected: 0 errors (`updateTag`는 파일 상단에서 이미 import됨).

---

## Task 4: 태그 어드민 쓰기 (`tags.admin.ts`)

**Files:**
- Create: `src/lib/api/tags.admin.ts`
- Test: `src/lib/api/tags.admin.test.ts`

- [ ] **Step 1: 실패 테스트 작성** — `src/lib/api/tags.admin.test.ts`

```ts
import { describe, it, expect, vi, afterEach } from "vitest";

const { apiMutateMock } = vi.hoisted(() => ({ apiMutateMock: vi.fn() }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { createTag, patchTag, deleteTag } from "./tags.admin";

afterEach(() => vi.clearAllMocks());

describe("태그 어드민 API", () => {
  it("createTag은 POST로 name을 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 1, name: "주일설교" });
    await createTag({ name: "주일설교" });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/tags", { method: "POST", body: { name: "주일설교" } });
  });
  it("patchTag은 PATCH로 name을 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 1, name: "수정" });
    await patchTag(1, { name: "수정" });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/tags/1", { method: "PATCH", body: { name: "수정" } });
  });
  it("deleteTag은 DELETE를 호출한다", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteTag(1);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/tags/1", { method: "DELETE" });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/lib/api/tags.admin.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현** — `src/lib/api/tags.admin.ts`

```ts
// 어드민 태그 쓰기. client 컴포넌트에서만 호출(authFetch·authStore 체인이 서버 번들에 들어가면 빌드 오류).
import { apiMutate } from "@/lib/admin/apiMutate";
import type { TagResponse } from "./types";

export interface TagCreateRequest { name: string } // ≤50
export interface TagUpdateRequest { name: string } // ≤50, version 없음. PATCH지만 프론트는 항상 name 전송(폼 ≥1 강제)

export function createTag(body: TagCreateRequest): Promise<TagResponse> {
  return apiMutate<TagResponse>("/api/admin/tags", { method: "POST", body });
}
export function patchTag(id: number, body: TagUpdateRequest): Promise<TagResponse> {
  return apiMutate<TagResponse>(`/api/admin/tags/${id}`, { method: "PATCH", body });
}
export function deleteTag(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/tags/${id}`, { method: "DELETE" });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run src/lib/api/tags.admin.test.ts`
Expected: PASS (3 tests).

---

## Task 5: 직분 어드민 쓰기 (`positions.admin.ts`)

**Files:**
- Create: `src/lib/api/positions.admin.ts`
- Test: `src/lib/api/positions.admin.test.ts`

- [ ] **Step 1: 실패 테스트 작성** — `src/lib/api/positions.admin.test.ts`

```ts
import { describe, it, expect, vi, afterEach } from "vitest";

const { apiMutateMock } = vi.hoisted(() => ({ apiMutateMock: vi.fn() }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { createPosition, patchPosition, deletePosition } from "./positions.admin";

afterEach(() => vi.clearAllMocks());

describe("직분 어드민 API", () => {
  it("createPosition은 POST로 sortOrder 포함 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 1 });
    await createPosition({ name: "목사", sortOrder: 10 });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/positions", { method: "POST", body: { name: "목사", sortOrder: 10 } });
  });
  it("createPosition은 sortOrder 없이도 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 1 });
    await createPosition({ name: "장로" });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/positions", { method: "POST", body: { name: "장로" } });
  });
  it("patchPosition은 PATCH로 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 1 });
    await patchPosition(1, { name: "권사", sortOrder: 20 });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/positions/1", { method: "PATCH", body: { name: "권사", sortOrder: 20 } });
  });
  it("deletePosition은 DELETE를 호출한다", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deletePosition(1);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/positions/1", { method: "DELETE" });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/lib/api/positions.admin.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현** — `src/lib/api/positions.admin.ts`

```ts
// 어드민 직분 쓰기. client 컴포넌트 전용(서버 번들 경계).
import { apiMutate } from "@/lib/admin/apiMutate";
import type { PositionResponse } from "./types";

export interface PositionCreateRequest { name: string; sortOrder?: number } // sortOrder 생략 → 백엔드 max+10
export interface PositionUpdateRequest { name: string; sortOrder?: number } // PATCH 부분수정. sortOrder 미포함=미변경

export function createPosition(body: PositionCreateRequest): Promise<PositionResponse> {
  return apiMutate<PositionResponse>("/api/admin/positions", { method: "POST", body });
}
export function patchPosition(id: number, body: PositionUpdateRequest): Promise<PositionResponse> {
  return apiMutate<PositionResponse>(`/api/admin/positions/${id}`, { method: "PATCH", body });
}
export function deletePosition(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/positions/${id}`, { method: "DELETE" });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run src/lib/api/positions.admin.test.ts`
Expected: PASS (4 tests).

> **G1 커밋 체크포인트(사용자 승인 시)**: Task 1–5 + 3 묶어 `feat: 태그·직분 어드민 API 계층(읽기·쓰기·태그 무효화) #41`.

---

## Task 6: 태그 폼 스키마 (`tags/schema.ts`)

**Files:**
- Create: `src/components/admin/tags/schema.ts`
- Test: `src/components/admin/tags/schema.test.ts`

- [ ] **Step 1: 실패 테스트 작성** — `src/components/admin/tags/schema.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { tagSchema } from "./schema";

describe("tagSchema", () => {
  it("정상 이름은 통과", () => {
    expect(tagSchema.safeParse({ name: "주일설교" }).success).toBe(true);
  });
  it("빈/공백 이름은 실패", () => {
    expect(tagSchema.safeParse({ name: "" }).success).toBe(false);
    expect(tagSchema.safeParse({ name: "   " }).success).toBe(false);
  });
  it("51자 이상은 실패", () => {
    expect(tagSchema.safeParse({ name: "가".repeat(51) }).success).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/components/admin/tags/schema.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현** — `src/components/admin/tags/schema.ts`

```ts
import { z } from "zod";

export const tagSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(50, "50자 이내로 입력해 주세요."),
});
export type TagFormValues = z.infer<typeof tagSchema>;
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run src/components/admin/tags/schema.test.ts`
Expected: PASS (3 tests).

---

## Task 7: 직분 폼 스키마 (`positions/schema.ts`)

**Files:**
- Create: `src/components/admin/positions/schema.ts`
- Test: `src/components/admin/positions/schema.test.ts`

- [ ] **Step 1: 실패 테스트 작성** — `src/components/admin/positions/schema.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { positionSchema } from "./schema";

describe("positionSchema", () => {
  it("name + sortOrder 숫자는 통과", () => {
    expect(positionSchema.safeParse({ name: "목사", sortOrder: 10 }).success).toBe(true);
  });
  it("sortOrder null 허용(비움)", () => {
    expect(positionSchema.safeParse({ name: "목사", sortOrder: null }).success).toBe(true);
  });
  it("빈 이름 실패", () => {
    expect(positionSchema.safeParse({ name: "", sortOrder: null }).success).toBe(false);
  });
  it("sortOrder 음수·소수 실패", () => {
    expect(positionSchema.safeParse({ name: "목사", sortOrder: -1 }).success).toBe(false);
    expect(positionSchema.safeParse({ name: "목사", sortOrder: 1.5 }).success).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/components/admin/positions/schema.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현** — `src/components/admin/positions/schema.ts`

```ts
import { z } from "zod";

// optional().default() 미사용(zodResolver 입출력 타입 불일치 회피). sortOrder는 number|null(빈값=null).
// zod v4 — number 커스텀 메시지 인자(invalid_type_error) 미사용(departments/schema.ts 동형).
export const positionSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(50, "50자 이내로 입력해 주세요."),
  sortOrder: z.number().int().nonnegative().nullable(),
});
export type PositionFormValues = z.infer<typeof positionSchema>;
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run src/components/admin/positions/schema.test.ts`
Expected: PASS (4 tests).

> **G2 커밋 체크포인트(사용자 승인 시)**: Task 6–7 → `feat: 태그·직분 폼 zod 스키마 #41`.

---

## Task 8: 태그 폼 다이얼로그 (`TagFormDialog.tsx`)

**Files:**
- Create: `src/components/admin/tags/TagFormDialog.tsx`
- Test: `src/components/admin/tags/TagFormDialog.test.tsx`

- [ ] **Step 1: 실패 테스트 작성** — `src/components/admin/tags/TagFormDialog.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/auth/apiError";

const { createMock, patchMock, notifySuccess, revalidateTagsMock } = vi.hoisted(() => ({
  createMock: vi.fn(), patchMock: vi.fn(), notifySuccess: vi.fn(), revalidateTagsMock: vi.fn(),
}));
vi.mock("@/lib/api/tags.admin", () => ({ createTag: createMock, patchTag: patchMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateTags: revalidateTagsMock }));

import { TagFormDialog } from "./TagFormDialog";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); revalidateTagsMock.mockResolvedValue(undefined); });
afterEach(() => vi.clearAllMocks());
const renderDialog = (ui: React.ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

describe("TagFormDialog", () => {
  it("등록: 이름 입력 후 저장하면 createTag 호출·닫힘", async () => {
    createMock.mockResolvedValue({ id: 1, name: "주일설교" });
    const onOpenChange = vi.fn();
    renderDialog(<TagFormDialog open mode="create" onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "주일설교" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createMock).toHaveBeenCalledWith({ name: "주일설교" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("빈 이름은 검증 실패로 createTag 미호출", async () => {
    renderDialog(<TagFormDialog open mode="create" onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("이름을 입력해 주세요.")).toBeDefined());
    expect(createMock).not.toHaveBeenCalled();
  });

  it("수정: initial.id로 patchTag 호출", async () => {
    patchMock.mockResolvedValue({ id: 7, name: "수정됨" });
    renderDialog(<TagFormDialog open mode="edit" initial={{ id: 7, name: "원본" }} onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "수정됨" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(patchMock).toHaveBeenCalledWith(7, { name: "수정됨" }));
  });

  it("중복(409 DUPLICATE_RESOURCE)이면 name 인라인 에러·다이얼로그 유지", async () => {
    createMock.mockRejectedValue(new ApiError(409, "DUPLICATE_RESOURCE", "이미 존재"));
    const onOpenChange = vi.fn();
    renderDialog(<TagFormDialog open mode="create" onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "중복" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("같은 이름이 이미 있습니다.")).toBeDefined());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/components/admin/tags/TagFormDialog.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현** — `src/components/admin/tags/TagFormDialog.tsx`

```tsx
"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { createTag, patchTag } from "@/lib/api/tags.admin";
import { revalidateTags } from "@/lib/admin/revalidate";
import type { TagResponse } from "@/lib/api/types";
import { tagSchema, type TagFormValues } from "./schema";

export interface TagFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: TagResponse;
}

export function TagFormDialog({ open, onOpenChange, mode, initial }: TagFormDialogProps) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: { name: initial?.name ?? "" },
  });

  // 열릴 때 베이스라인 리셋(재오픈 시 이전 입력 잔존 방지). AlbumFormDialog 선례 — effect+reset만(setState-in-effect 아님).
  useEffect(() => {
    if (!open) return;
    reset({ name: mode === "edit" && initial ? initial.name : "" });
  }, [open, mode, initial, reset]);

  const mutation = useMutation({
    mutationFn: (v: TagFormValues) =>
      mode === "edit" && initial ? patchTag(initial.id, { name: v.name }) : createTag({ name: v.name }),
    onError: adminOnError({
      onDuplicate: () => setError("name", { message: "같은 이름이 이미 있습니다." }),
      onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof TagFormValues, { message: fe.reason })),
    }),
    onSuccess: async () => {
      await revalidateTags();
      qc.invalidateQueries({ queryKey: ["tags"] });
      notify.success("저장했습니다.");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "태그 수정" : "태그 등록"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-base">
          <div className="flex flex-col gap-xxs">
            <label htmlFor="tag-name" className={cn(typo.bodySm, "text-body")}>이름</label>
            <Input id="tag-name" error={errors.name?.message} {...register("name")} />
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

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run src/components/admin/tags/TagFormDialog.test.tsx`
Expected: PASS (4 tests).

---

## Task 9: 태그 매니저 (`TagManager.tsx`)

**Files:**
- Create: `src/components/admin/tags/TagManager.tsx`
- Test: `src/components/admin/tags/TagManager.test.tsx`

> 행 액션 버튼은 모달 확정 버튼("삭제")과 접근성 이름이 겹치지 않도록 `aria-label={`${name} 수정/삭제`}`를 단다(DepartmentTree 선례). `Button`은 `...props`로 `aria-label`을 전달한다.

- [ ] **Step 1: 실패 테스트 작성** — `src/components/admin/tags/TagManager.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getTagsMock, createMock, patchMock, deleteMock, notifySuccess, revalidateTagsMock } = vi.hoisted(() => ({
  getTagsMock: vi.fn(), createMock: vi.fn(), patchMock: vi.fn(), deleteMock: vi.fn(), notifySuccess: vi.fn(), revalidateTagsMock: vi.fn(),
}));
vi.mock("@/lib/api/tags", () => ({ getTags: getTagsMock }));
vi.mock("@/lib/api/tags.admin", () => ({ createTag: createMock, patchTag: patchMock, deleteTag: deleteMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateTags: revalidateTagsMock }));

import { TagManager } from "./TagManager";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); revalidateTagsMock.mockResolvedValue(undefined); });
afterEach(() => vi.clearAllMocks());
const renderManager = () => render(<QueryClientProvider client={qc}><TagManager /></QueryClientProvider>);

describe("TagManager", () => {
  it("태그 목록을 렌더", async () => {
    getTagsMock.mockResolvedValue([{ id: 1, name: "주일설교" }, { id: 2, name: "특별새벽" }]);
    renderManager();
    await waitFor(() => expect(screen.getByText("주일설교")).toBeDefined());
    expect(screen.getByText("특별새벽")).toBeDefined();
  });

  it("빈 목록 안내", async () => {
    getTagsMock.mockResolvedValue([]);
    renderManager();
    await waitFor(() => expect(screen.getByText("등록된 태그가 없습니다.")).toBeDefined());
  });

  it("새 태그 → 등록 다이얼로그에서 createTag", async () => {
    getTagsMock.mockResolvedValue([]);
    createMock.mockResolvedValue({ id: 9, name: "새태그" });
    renderManager();
    await waitFor(() => expect(screen.getByText("등록된 태그가 없습니다.")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "새 태그" }));
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "새태그" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createMock).toHaveBeenCalledWith({ name: "새태그" }));
  });

  it("삭제 확인 후 deleteTag·revalidateTags 호출", async () => {
    getTagsMock.mockResolvedValue([{ id: 1, name: "주일설교" }]);
    deleteMock.mockResolvedValue(undefined);
    renderManager();
    await waitFor(() => expect(screen.getByText("주일설교")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "주일설교 삭제" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "삭제" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(1));
    await waitFor(() => expect(revalidateTagsMock).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/components/admin/tags/TagManager.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현** — `src/components/admin/tags/TagManager.tsx`

```tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { getTags } from "@/lib/api/tags";
import { deleteTag } from "@/lib/api/tags.admin";
import { revalidateTags } from "@/lib/admin/revalidate";
import type { TagResponse } from "@/lib/api/types";
import { TagFormDialog } from "./TagFormDialog";

export function TagManager() {
  const qc = useQueryClient();
  // ["tags"] 키 공유 — TagMultiSelect·갤러리 필터와 동일 키라 invalidate 시 함께 갱신.
  const { data: tags = [], isLoading } = useQuery({ queryKey: ["tags"], queryFn: getTags });
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TagResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagResponse | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => deleteTag(id),
    onError: adminOnError(),
    onSuccess: async () => {
      await revalidateTags();
      qc.invalidateQueries({ queryKey: ["tags"] });
      notify.success("삭제했습니다.");
      setDeleteTarget(null);
    },
  });

  const columns: Column<TagResponse>[] = [{ key: "name", header: "이름", cell: (t) => t.name }];

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>새 태그</Button>
      </div>
      <div className="mt-base">
        <DataTable
          columns={columns}
          rows={tags}
          rowKey={(t) => t.id}
          loading={isLoading}
          empty={<p className={cn(typo.bodyMd, "text-muted")}>등록된 태그가 없습니다.</p>}
          actions={(t) => (
            <div className="flex justify-end gap-xs">
              <Button type="button" variant="tertiary" aria-label={`${t.name} 수정`} onClick={() => setEditTarget(t)}>수정</Button>
              <Button type="button" variant="tertiary" aria-label={`${t.name} 삭제`} onClick={() => setDeleteTarget(t)}>삭제</Button>
            </div>
          )}
        />
      </div>

      <TagFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      <TagFormDialog
        open={editTarget != null}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        mode="edit"
        initial={editTarget ?? undefined}
      />
      <DeleteConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title={deleteTarget ? `'${deleteTarget.name}' 태그를 삭제할까요?` : "태그를 삭제할까요?"}
        warning="이 태그를 삭제하면 연결된 설교·공지·일정·부서에서도 태그가 함께 제거됩니다."
        pending={remove.isPending}
        onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id); }}
      />
    </>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run src/components/admin/tags/TagManager.test.tsx`
Expected: PASS (4 tests).

> **G3 커밋 체크포인트(사용자 승인 시)**: Task 8–9 → `feat: 태그 관리 화면(목록·CRUD) #41`.

---

## Task 10: 직분 폼 다이얼로그 (`PositionFormDialog.tsx`)

**Files:**
- Create: `src/components/admin/positions/PositionFormDialog.tsx`
- Test: `src/components/admin/positions/PositionFormDialog.test.tsx`

- [ ] **Step 1: 실패 테스트 작성** — `src/components/admin/positions/PositionFormDialog.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { createMock, patchMock, notifySuccess } = vi.hoisted(() => ({ createMock: vi.fn(), patchMock: vi.fn(), notifySuccess: vi.fn() }));
vi.mock("@/lib/api/positions.admin", () => ({ createPosition: createMock, patchPosition: patchMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));

import { PositionFormDialog } from "./PositionFormDialog";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
const renderDialog = (ui: React.ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

describe("PositionFormDialog", () => {
  it("등록: name+sortOrder를 createPosition에 전달", async () => {
    createMock.mockResolvedValue({ id: 1 });
    renderDialog(<PositionFormDialog open mode="create" onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "목사" } });
    fireEvent.change(screen.getByLabelText("정렬 순서(선택)"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createMock).toHaveBeenCalledWith({ name: "목사", sortOrder: 10 }));
  });

  it("등록: sortOrder 비우면 body에서 생략", async () => {
    createMock.mockResolvedValue({ id: 1 });
    renderDialog(<PositionFormDialog open mode="create" onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "장로" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createMock).toHaveBeenCalledWith({ name: "장로" }));
  });

  it("수정: initial 시드 후 patchPosition 호출", async () => {
    patchMock.mockResolvedValue({ id: 5 });
    renderDialog(<PositionFormDialog open mode="edit" initial={{ id: 5, name: "권사", sortOrder: 30, createdAt: "2026-06-17T00:00:00" }} onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "안수집사" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(patchMock).toHaveBeenCalledWith(5, { name: "안수집사", sortOrder: 30 }));
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/components/admin/positions/PositionFormDialog.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현** — `src/components/admin/positions/PositionFormDialog.tsx`

```tsx
"use client";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { createPosition, patchPosition, type PositionCreateRequest } from "@/lib/api/positions.admin";
import type { PositionResponse } from "@/lib/api/types";
import { positionSchema, type PositionFormValues } from "./schema";

export interface PositionFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: PositionResponse;
}

export function PositionFormDialog({ open, onOpenChange, mode, initial }: PositionFormDialogProps) {
  const qc = useQueryClient();
  const { register, handleSubmit, control, reset, setError, formState: { errors } } = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: { name: initial?.name ?? "", sortOrder: initial?.sortOrder ?? null },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      mode === "edit" && initial
        ? { name: initial.name, sortOrder: initial.sortOrder }
        : { name: "", sortOrder: null },
    );
  }, [open, mode, initial, reset]);

  const mutation = useMutation({
    mutationFn: (v: PositionFormValues) => {
      // sortOrder null(비움) → body 생략. create=백엔드 자동부여, edit(PATCH)=미변경.
      const body: PositionCreateRequest = { name: v.name, ...(v.sortOrder !== null ? { sortOrder: v.sortOrder } : {}) };
      return mode === "edit" && initial ? patchPosition(initial.id, body) : createPosition(body);
    },
    onError: adminOnError({
      onDuplicate: () => setError("name", { message: "같은 이름이 이미 있습니다." }),
      onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof PositionFormValues, { message: fe.reason })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["positions"] });
      notify.success("저장했습니다.");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "직분 수정" : "직분 등록"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-base">
          <div className="flex flex-col gap-xxs">
            <label htmlFor="position-name" className={cn(typo.bodySm, "text-body")}>이름</label>
            <Input id="position-name" error={errors.name?.message} {...register("name")} />
          </div>
          <div className="flex flex-col gap-xxs">
            <label htmlFor="position-sortOrder" className={cn(typo.bodySm, "text-body")}>정렬 순서(선택)</label>
            <Controller
              control={control}
              name="sortOrder"
              render={({ field }) => (
                <Input
                  id="position-sortOrder"
                  type="number"
                  inputMode="numeric"
                  value={field.value === null ? "" : String(field.value)}
                  onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                  error={errors.sortOrder?.message}
                />
              )}
            />
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

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run src/components/admin/positions/PositionFormDialog.test.tsx`
Expected: PASS (3 tests).

---

## Task 11: 직분 매니저 (`PositionManager.tsx`)

**Files:**
- Create: `src/components/admin/positions/PositionManager.tsx`
- Test: `src/components/admin/positions/PositionManager.test.tsx`

- [ ] **Step 1: 실패 테스트 작성** — `src/components/admin/positions/PositionManager.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getMock, createMock, patchMock, deleteMock, notifySuccess } = vi.hoisted(() => ({
  getMock: vi.fn(), createMock: vi.fn(), patchMock: vi.fn(), deleteMock: vi.fn(), notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/positions", () => ({ getPositions: getMock }));
vi.mock("@/lib/api/positions.admin", () => ({ createPosition: createMock, patchPosition: patchMock, deletePosition: deleteMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));

import { PositionManager } from "./PositionManager";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
const renderManager = () => render(<QueryClientProvider client={qc}><PositionManager /></QueryClientProvider>);

describe("PositionManager", () => {
  it("목록(이름·정렬순서)과 권한무관 안내를 렌더", async () => {
    getMock.mockResolvedValue([{ id: 1, name: "목사", sortOrder: 10, createdAt: "2026-06-17T00:00:00" }]);
    renderManager();
    await waitFor(() => expect(screen.getByText("목사")).toBeDefined());
    expect(screen.getByText("정렬 순서")).toBeDefined();
    expect(screen.getByText(/권한과 무관/)).toBeDefined();
  });

  it("빈 목록 안내", async () => {
    getMock.mockResolvedValue([]);
    renderManager();
    await waitFor(() => expect(screen.getByText("등록된 직분이 없습니다.")).toBeDefined());
  });

  it("삭제 확인 후 deletePosition 호출", async () => {
    getMock.mockResolvedValue([{ id: 1, name: "목사", sortOrder: 10, createdAt: "2026-06-17T00:00:00" }]);
    deleteMock.mockResolvedValue(undefined);
    renderManager();
    await waitFor(() => expect(screen.getByText("목사")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "목사 삭제" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "삭제" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(1));
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/components/admin/positions/PositionManager.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현** — `src/components/admin/positions/PositionManager.tsx`

```tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { getPositions } from "@/lib/api/positions";
import { deletePosition } from "@/lib/api/positions.admin";
import type { PositionResponse } from "@/lib/api/types";
import { PositionFormDialog } from "./PositionFormDialog";

export function PositionManager() {
  const qc = useQueryClient();
  const { data: positions = [], isLoading } = useQuery({ queryKey: ["positions"], queryFn: getPositions });
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PositionResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PositionResponse | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => deletePosition(id),
    onError: adminOnError(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["positions"] });
      notify.success("삭제했습니다.");
      setDeleteTarget(null);
    },
  });

  const columns: Column<PositionResponse>[] = [
    { key: "name", header: "이름", cell: (p) => p.name },
    { key: "sortOrder", header: "정렬 순서", cell: (p) => p.sortOrder },
  ];

  return (
    <>
      <div className="mt-base flex items-start gap-xs rounded-xl bg-surface-soft p-base">
        <Info size={20} aria-hidden className="mt-xxs shrink-0 text-muted" />
        <p className={cn(typo.bodySm, "text-body")}>직분은 표시용 이름이며 로그인 권한과 무관합니다.</p>
      </div>

      <div className="mt-lg flex justify-end">
        <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>새 직분</Button>
      </div>
      <div className="mt-base">
        <DataTable
          columns={columns}
          rows={positions}
          rowKey={(p) => p.id}
          loading={isLoading}
          empty={<p className={cn(typo.bodyMd, "text-muted")}>등록된 직분이 없습니다.</p>}
          actions={(p) => (
            <div className="flex justify-end gap-xs">
              <Button type="button" variant="tertiary" aria-label={`${p.name} 수정`} onClick={() => setEditTarget(p)}>수정</Button>
              <Button type="button" variant="tertiary" aria-label={`${p.name} 삭제`} onClick={() => setDeleteTarget(p)}>삭제</Button>
            </div>
          )}
        />
      </div>

      <PositionFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      <PositionFormDialog
        open={editTarget != null}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        mode="edit"
        initial={editTarget ?? undefined}
      />
      <DeleteConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title={deleteTarget ? `'${deleteTarget.name}' 직분을 삭제할까요?` : "직분을 삭제할까요?"}
        warning="이 직분을 삭제합니다. 되돌릴 수 없습니다."
        pending={remove.isPending}
        onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id); }}
      />
    </>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run src/components/admin/positions/PositionManager.test.tsx`
Expected: PASS (3 tests).

> **G4 커밋 체크포인트(사용자 승인 시)**: Task 10–11 → `feat: 직분 관리 화면(목록·CRUD·정렬순서) #41`.

---

## Task 12: 태그 라우트 (`tags/page.tsx`)

**Files:**
- Create: `src/app/(site)/mypage/manage/tags/page.tsx`

> 얇은 래퍼(권한 게이트 + Manager). `useSearchParams` 미사용 → Suspense 불요. 단위 테스트 없음(Manager가 검증). 검증은 빌드/타입체크.

- [ ] **Step 1: 구현** — `src/app/(site)/mypage/manage/tags/page.tsx`

```tsx
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { TagManager } from "@/components/admin/tags/TagManager";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 운영 전용 화면(manage-hub → kind:"manage"). 부모 manage/layout이 로그인 가드, 여기서 TAG_MANAGE 게이트.
export default function ManageTagsPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>태그 관리</h1>
      <div className="mt-xl">
        <RequirePermission permission="TAG_MANAGE" fallback={<EditAccessDenied />}>
          <TagManager />
        </RequirePermission>
      </div>
    </Container>
  );
}
```

- [ ] **Step 2: 타입체크 확인**

Run: `npx tsc --noEmit`
Expected: 0 errors.

---

## Task 13: 직분 라우트 (`positions/page.tsx`)

**Files:**
- Create: `src/app/(site)/mypage/manage/positions/page.tsx`

- [ ] **Step 1: 구현** — `src/app/(site)/mypage/manage/positions/page.tsx`

```tsx
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { PositionManager } from "@/components/admin/positions/PositionManager";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 운영 전용 화면(manage-hub → kind:"manage"). 부모 manage/layout이 로그인 가드, 여기서 POSITION_MANAGE 게이트.
export default function ManagePositionsPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>직분 관리</h1>
      <div className="mt-xl">
        <RequirePermission permission="POSITION_MANAGE" fallback={<EditAccessDenied />}>
          <PositionManager />
        </RequirePermission>
      </div>
    </Container>
  );
}
```

- [ ] **Step 2: 타입체크 확인**

Run: `npx tsc --noEmit`
Expected: 0 errors.

> **G5 커밋 체크포인트(사용자 승인 시)**: Task 12–13 → `feat: 태그·직분 관리 라우트 게이트 #41`.

---

## Task 14: DESIGN.md 컴포넌트 등록

**Files:**
- Modify: `.claude/rules/DESIGN.md` (어드민 공용 블록 — `department-form-modal` 항목 **바로 아래**에 추가)

- [ ] **Step 1: 추가** — `.claude/rules/DESIGN.md`의 `- **`department-form-modal`**: …` 줄 다음에 4개 항목 삽입

```markdown
- **`tag-manager`**: 태그 목록·CRUD 화면(트랙 06). `DataTable`(이름) + 툴바 `새 태그` + 행 `수정`·`삭제`(`DeleteConfirmDialog`, 비차단 삭제 경고문). 목록은 공개 `getTags`(`["tags"]` 키 공유) 재사용, mutation onSuccess에서 `["tags"]` invalidate + `revalidateTags()`로 공개 ISR 무효화.
- **`tag-form-modal`**: 태그 생성·수정 Dialog(트랙 06). `Input`(이름) 단일 필드. version 없음 — 행 값 시드(상세 GET 불요). 중복 시 name 인라인 에러(`onDuplicate`).
- **`position-manager`**: 직분 목록·CRUD 화면(트랙 06). `DataTable`(이름·정렬순서) + 상단 "권한 무관 표시용" 안내 배너(lucide `Info`). 공개 소비자 없음 — `["positions"]` 클라 쿼리만 무효화.
- **`position-form-modal`**: 직분 생성·수정 Dialog(트랙 06). `Input`(이름) + number `Input`(정렬 순서, `Controller`로 null↔"" 매핑). 생성 시 정렬순서 생략→백엔드 자동부여, 수정 시 비움→미변경(body 생략).
```

- [ ] **Step 2: 문서 일관성 확인** (수동 검토)

`.claude/rules/DESIGN.md`에 4개 항목이 어드민 공용 블록 안에 추가됐는지 확인.

> **G6 커밋 체크포인트(사용자 승인 시)**: Task 14 → `docs: DESIGN.md 태그·직분 어드민 컴포넌트 등록 #41`.

---

## Task 15: 전체 게이트 검증

**Files:** 없음(검증만)

- [ ] **Step 1: 전체 테스트**

Run: `pnpm test`
Expected: 전체 PASS(기존 + 신규 ~30 tests 추가). 실패 시 해당 Task로 복귀.

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: 린트**

Run: `pnpm lint`
Expected: 0 errors. (effect 내 setState 금지 — Manager는 effect 미사용, FormDialog는 effect+reset만이라 통과.)

- [ ] **Step 4: 수동 확인(dev 서버)**

`pnpm dev` 후 TAG_MANAGE·POSITION_MANAGE 권한 계정 로그인 → `/mypage/manage/tags`·`/mypage/manage/positions` 진입. 태그/직분 추가·수정·삭제, 중복 이름 인라인 에러, 직분 정렬순서 입력·권한무관 배너, 삭제 경고문 확인. 권한 미보유 계정은 `EditAccessDenied` 폴백 확인.

---

## Self-Review

**1. 스펙 커버리지**
- 태그 CRUD → Task 4·8·9 ✓ / 직분 CRUD(+정렬순서) → Task 5·7·10·11 ✓
- 삭제 경고(태그 비차단·직분 물리) → Task 9·11 warning 문구 ✓
- 중복 이름 안내 → Task 8·10 `onDuplicate` 인라인 ✓
- 직분 권한무관 안내(이슈 줄20) → Task 11 Info 배너 ✓
- 태그 캐시 무효화(공개 ISR + 클라 공유키) → Task 2·3·8·9 ✓ / 직분 클라만 → Task 11 ✓
- 라우트·권한 게이트 → Task 12·13 ✓ / DESIGN 등록 → Task 14 ✓
- 테스트 80%+ → 각 Task TDD + Task 15 게이트 ✓

**2. Placeholder 스캔** — 모든 Step에 실제 코드/명령/기대출력 포함. TBD·"적절히 처리" 없음.

**3. 타입 일관성** — `createTag`/`patchTag`/`deleteTag`·`createPosition`/`patchPosition`/`deletePosition`·`getPositions`·`PositionResponse`·`revalidateTags`·`tagSchema`/`positionSchema`·쿼리키 `["tags"]`/`["positions"]`가 전 Task에서 동일하게 사용됨. `PositionUpdateRequest`/`PositionCreateRequest` 동일 구조(`{name; sortOrder?}`)라 `body` 공용 전달 가능.
