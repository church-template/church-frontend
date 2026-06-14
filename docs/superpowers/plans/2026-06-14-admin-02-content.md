# 어드민 02 콘텐츠(설교·공지) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 권한 보유 운영자가 공개 설교·공지 페이지의 인라인 액션 + 전용 편집 라우트로 설교·공지를 등록·수정·삭제한다.

**Architecture:** 공개 RSC 페이지(ISR/no-store) 위에 `'use client'` 액션 island를 얹고, 편집은 `(site)` 그룹 전용 라우트 폼(RHF+zod). 어드민 쓰기는 01-core `apiMutate`+TanStack `useMutation`, 게이팅은 `RequirePermission`(`useMe` 라이브 권한). 02는 공유 자산 `MarkdownEditor`·`TagMultiSelect`·인라인 액션 패턴의 **단일 생산자**.

**Tech Stack:** Next.js(App Router) · TypeScript · TanStack Query · react-hook-form + zod · Radix(Tabs·Popover) 재스킨 · vitest + @testing-library/react(jsdom, `fireEvent`).

**소스 진실:** 설계 `docs/superpowers/specs/2026-06-14-admin-02-content-design.md` · 조율 `…admin-track-parallelization.md` · `docs/api-docs.json`.

**공통 테스트 관례(전 태스크 적용):** vitest `globals:false` → `import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"`. RTL은 `import { render, screen, fireEvent, waitFor } from "@testing-library/react"`. **jest-dom 없음** → `.getAttribute()`·`.toBeDefined()`·`.toBeNull()`·`screen.queryBy*` 사용. `vi.stubGlobal("fetch", …)` 또는 `vi.mock(…, () => …)` + `vi.hoisted`. 쿼리/뮤테이션 컴포넌트는 `<QueryClientProvider client={new QueryClient({ defaultOptions:{ queries:{ retry:false } } })}>`로 감싼다. `ApiError` 생성자 순서: `new ApiError(status, errorCode, detail, title, instance, errors, references)`. **Radix 동작 컴포넌트 활성화(jsdom)**: Tabs 탭 전환은 `fireEvent.mouseDown`(click 미동작), Popover/Dialog 열기는 트리거 `fireEvent.click`(안 열리면 `fireEvent.mouseDown`/`pointerDown` 시도). `DeleteConfirmDialog`는 `open` prop 제어라 트리거 불필요.

**커밋 규칙:** 메시지 `<type> : <desc> #36`(Co-Authored-By 금지). worktree `.worktrees/36-content`, 브랜치 `20260614_#36_콘텐츠_등록_수정_삭제`.

**설계와의 차이(의도적):** 설계의 `useSermonMutations`/`useNoticeMutations` 별도 훅은 두지 않는다 — `onError`(onFieldErrors·onReedit)가 소비처(폼/삭제/토글)마다 달라 `useMutation`을 각 컴포넌트에 인라인한다(YAGNI). 공유 레이어는 `apiMutate` 래핑 api 함수(`createSermon` 등).

---

## File Structure

**공유 생산물(03·05 소비 — 인터페이스 확정 의무)**
- Create `src/components/ui/Textarea.tsx` — 멀티라인 입력 프리미티브(Input.text 스타일 이식)
- Create `src/components/admin/MarkdownEditor.tsx` — 작성/미리보기 탭 에디터
- Create `src/components/admin/TagMultiSelect.tsx` — 기존 태그 다중선택

**API 도메인-로컬(철칙 2: 요청 타입·CRUD는 도메인 파일에)**
- Modify `src/lib/api/sermons.ts` — 요청 타입 + `createSermon`·`updateSermon`·`patchSermon`·`deleteSermon`
- Modify `src/lib/api/notices.ts` — 요청 타입(+isPinned) + 동일 CRUD

**폼·스키마·라우트·액션**
- Create `src/components/sermons/schemas.ts`·`src/components/notices/schemas.ts` — zod
- Create `src/components/sermons/SermonForm.tsx`·`src/components/notices/NoticeForm.tsx`
- Create `src/components/sermons/SermonAdminActions.tsx`·`src/components/notices/NoticeAdminActions.tsx`
- Create `src/app/(site)/sermons/new/page.tsx`·`[id]/edit/page.tsx`(공지 동일)
- Modify `src/app/(site)/sermons/page.tsx`·`[id]/page.tsx`·`notices/page.tsx`·`[id]/page.tsx` — island 1줄 삽입

**문서**
- Modify `.claude/rules/DESIGN.md` — `<!-- admin:02 -->` 마커 아래 3항목 append

---

## Task 1: Textarea 프리미티브

**Files:**
- Create: `src/components/ui/Textarea.tsx`
- Test: `src/components/ui/Textarea.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

```tsx
// src/components/ui/Textarea.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("error가 있으면 caption 메시지와 aria-invalid를 노출한다", () => {
    render(<Textarea aria-label="본문" error="본문을 입력해 주세요." />);
    const area = screen.getByLabelText("본문");
    expect(area.getAttribute("aria-invalid")).toBe("true");
    expect(area.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText("본문을 입력해 주세요.")).toBeDefined();
  });

  it("error가 없으면 메시지를 렌더하지 않고 aria-invalid도 없다", () => {
    render(<Textarea aria-label="본문" />);
    expect(screen.getByLabelText("본문").getAttribute("aria-invalid")).toBeNull();
    expect(screen.queryByText("본문을 입력해 주세요.")).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/components/ui/Textarea.test.tsx`
Expected: FAIL — `Failed to resolve import "./Textarea"`.

- [ ] **Step 3: 최소 구현**

```tsx
// src/components/ui/Textarea.tsx
"use client";

import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

// Input의 text variant 스타일을 멀티라인으로 이식. 높이는 rows로(px 인라인 금지), 토큰 공유.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, id, rows = 12, ...props }, ref) => {
    const reactId = useId();
    const areaId = id ?? reactId;
    const errorId = `${areaId}-error`;
    return (
      <div className="flex flex-col gap-xxs">
        <textarea
          ref={ref}
          id={areaId}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            typo.bodyMd,
            "w-full resize-y rounded-md border border-hairline bg-canvas px-4 py-3 text-ink outline-hidden placeholder:text-muted",
            "transition duration-150 ease-out hover:border-muted-soft",
            "focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary",
            "disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-muted",
            error &&
              "border-error hover:border-error focus-visible:border-error focus-visible:ring-error",
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
Textarea.displayName = "Textarea";
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/components/ui/Textarea.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/components/ui/Textarea.tsx src/components/ui/Textarea.test.tsx
git commit -m "feat : Textarea 프리미티브(멀티라인 입력) #36"
```

---

## Task 2: MarkdownEditor (작성/미리보기 탭)

**Files:**
- Create: `src/components/admin/MarkdownEditor.tsx`
- Test: `src/components/admin/MarkdownEditor.test.tsx`

의존(기존): `@/components/ui/tabs`(Radix Tabs 재스킨, `Tabs value onValueChange`·`TabsList`·`TabsTrigger value`·`TabsContent value`), `@/components/ui/Textarea`(Task 1), `@/components/common/MarkdownContent`(`source` prop, `renderMarkdown`로 marked+DOMPurify). 미리보기는 `tab === "preview"`일 때만 마운트해 변환(비활성 패널은 hidden 유지). **테스트의 탭 전환은 `fireEvent.mouseDown`** — Radix Tabs는 jsdom에서 click으로 전환되지 않는다.

- [ ] **Step 1: 실패 테스트 작성**

```tsx
// src/components/admin/MarkdownEditor.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownEditor } from "./MarkdownEditor";

describe("MarkdownEditor", () => {
  it("작성 탭에서 입력하면 onChange로 값을 올린다", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "안녕하세요" } });
    expect(onChange).toHaveBeenCalledWith("안녕하세요");
  });

  it("미리보기 탭으로 전환하면 마크다운이 HTML로 렌더된다", () => {
    render(<MarkdownEditor value={"# 환영합니다"} onChange={() => {}} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "미리보기" })); // Radix Tabs는 jsdom에서 click 미동작
    expect(screen.getByRole("heading", { name: "환영합니다" })).toBeDefined();
  });

  it("본문이 비어 있으면 미리보기에 안내문을 보인다", () => {
    render(<MarkdownEditor value="   " onChange={() => {}} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "미리보기" })); // Radix Tabs는 jsdom에서 click 미동작
    expect(screen.getByText("미리볼 내용이 없습니다.")).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/components/admin/MarkdownEditor.test.tsx`
Expected: FAIL — import 해결 불가.

- [ ] **Step 3: 최소 구현**

```tsx
// src/components/admin/MarkdownEditor.tsx
"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/Textarea";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  error?: string;
  placeholder?: string;
}

// 미리보기 MarkdownContent는 tab==="preview"일 때만 마운트 → 작성 중(키 입력)엔 renderMarkdown 미실행.
// (Radix는 비활성 TabsContent를 언마운트하지 않고 hidden으로 유지하므로 tab 상태로 직접 게이트한다.)
export function MarkdownEditor({ value, onChange, id, error, placeholder }: MarkdownEditorProps) {
  const [tab, setTab] = useState("write");
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="write">작성</TabsTrigger>
        <TabsTrigger value="preview">미리보기</TabsTrigger>
      </TabsList>
      <TabsContent value="write">
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          error={error}
          placeholder={placeholder}
        />
      </TabsContent>
      <TabsContent value="preview">
        {tab === "preview" ? (
          value.trim() ? (
            <MarkdownContent source={value} />
          ) : (
            <p className={cn(typo.bodySm, "text-muted")}>미리볼 내용이 없습니다.</p>
          )
        ) : null}
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/components/admin/MarkdownEditor.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/components/admin/MarkdownEditor.tsx src/components/admin/MarkdownEditor.test.tsx
git commit -m "feat : MarkdownEditor 작성/미리보기 탭(02 단독 생산) #36"
```

---

## Task 3: TagMultiSelect (기존 태그 다중선택)

**Files:**
- Create: `src/components/admin/TagMultiSelect.tsx`
- Test: `src/components/admin/TagMultiSelect.test.tsx`

의존(기존): `@/components/ui/popover`·`@/components/ui/Checkbox`(`label`+제어 `checked`/`onChange`)·`@/components/ui/Badge`(`variant="primary"`)·`@/components/ui/Button`·`@/lib/api/tags`(`getTags():Promise<TagResponse[]>`, `TagResponse{id,name}`). 내부 `useQuery(['tags'], getTags)`. 신규 생성 없음(06 소관).

- [ ] **Step 1: 실패 테스트 작성**

```tsx
// src/components/admin/TagMultiSelect.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getTagsMock } = vi.hoisted(() => ({ getTagsMock: vi.fn() }));
vi.mock("@/lib/api/tags", () => ({ getTags: getTagsMock }));

import { TagMultiSelect } from "./TagMultiSelect";

afterEach(() => vi.clearAllMocks());

function renderWithQc(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("TagMultiSelect", () => {
  it("기존 태그를 선택하면 onChange로 tagIds를 올린다", async () => {
    getTagsMock.mockResolvedValue([
      { id: 1, name: "청년부" },
      { id: 2, name: "주일예배" },
    ]);
    const onChange = vi.fn();
    renderWithQc(<TagMultiSelect value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "태그 선택" }));
    await waitFor(() => expect(screen.getByText("청년부")).toBeDefined());
    fireEvent.click(screen.getByText("청년부"));
    expect(onChange).toHaveBeenCalledWith([1]);
  });

  it("이미 선택된 태그는 칩(Badge)으로 보인다", async () => {
    getTagsMock.mockResolvedValue([{ id: 1, name: "청년부" }]);
    renderWithQc(<TagMultiSelect value={[1]} onChange={() => {}} />);
    await waitFor(() => expect(screen.getAllByText("청년부").length).toBeGreaterThan(0));
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/components/admin/TagMultiSelect.test.tsx`
Expected: FAIL — import 해결 불가.

- [ ] **Step 3: 최소 구현**

```tsx
// src/components/admin/TagMultiSelect.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getTags } from "@/lib/api/tags";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface TagMultiSelectProps {
  value: number[];
  onChange: (value: number[]) => void;
}

// 기존 태그 선택 전용(신규 생성=06 TAG_MANAGE 소관). 옵션은 공개 getTags.
export function TagMultiSelect({ value, onChange }: TagMultiSelectProps) {
  const { data: tags = [] } = useQuery({ queryKey: ["tags"], queryFn: getTags });
  const selected = tags.filter((t) => value.includes(t.id));
  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }
  return (
    <div className="flex flex-col gap-sm">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="secondary">
            태그 선택
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          {tags.length > 0 ? (
            <ul className="flex flex-col gap-xs">
              {tags.map((t) => (
                <li key={t.id}>
                  <Checkbox
                    label={t.name}
                    checked={value.includes(t.id)}
                    onChange={() => toggle(t.id)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className={cn(typo.bodySm, "text-muted")}>등록된 태그가 없습니다.</p>
          )}
        </PopoverContent>
      </Popover>
      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-xs">
          {selected.map((t) => (
            <li key={t.id}>
              <Badge variant="primary">{t.name}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/components/admin/TagMultiSelect.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/components/admin/TagMultiSelect.tsx src/components/admin/TagMultiSelect.test.tsx
git commit -m "feat : TagMultiSelect 기존 태그 다중선택(02 단독 생산) #36"
```

---

## Task 4: 설교 어드민 API (요청 타입 + CRUD)

**Files:**
- Modify: `src/lib/api/sermons.ts`(끝에 추가 — 기존 GET 함수 변경 금지)
- Test: `src/lib/api/sermons.admin.test.ts`

필드(api-docs.json): Create 필수 `title·preacher·preachedAt`. PUT은 `version` 추가(전체 교체). PATCH는 `version`만 필수(보낸 필드만 적용). DELETE 204.

- [ ] **Step 1: 실패 테스트 작성**

```ts
// src/lib/api/sermons.admin.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

const { apiMutateMock } = vi.hoisted(() => ({ apiMutateMock: vi.fn() }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { createSermon, updateSermon, patchSermon, deleteSermon } from "./sermons";

afterEach(() => vi.clearAllMocks());

describe("설교 어드민 API", () => {
  it("createSermon은 POST /api/admin/sermons로 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 7 });
    await createSermon({ title: "t", preacher: "p", preachedAt: "2026-06-01" });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/sermons", {
      method: "POST",
      body: { title: "t", preacher: "p", preachedAt: "2026-06-01" },
    });
  });

  it("updateSermon은 PUT /{id}로 version 포함 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 7 });
    await updateSermon(7, { title: "t", preacher: "p", preachedAt: "2026-06-01", version: 3 });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/sermons/7", {
      method: "PUT",
      body: { title: "t", preacher: "p", preachedAt: "2026-06-01", version: 3 },
    });
  });

  it("patchSermon은 PATCH /{id}로 부분 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 7 });
    await patchSermon(7, { version: 3, title: "수정" });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/sermons/7", {
      method: "PATCH",
      body: { version: 3, title: "수정" },
    });
  });

  it("deleteSermon은 DELETE /{id}", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteSermon(7);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/sermons/7", { method: "DELETE" });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/lib/api/sermons.admin.test.ts`
Expected: FAIL — `createSermon` 등 export 없음.

- [ ] **Step 3: 최소 구현 (sermons.ts 끝에 추가)**

```ts
// src/lib/api/sermons.ts (파일 끝에 추가). 상단에 import 추가:
//   import { apiMutate } from "@/lib/admin/apiMutate";
//   import type { SermonDetailResponse } from "./types";   // 이미 import면 생략

// ── 어드민 쓰기(도메인-로컬 타입, 철칙 2). 수정 타입에 낙관락 version 포함. ──
export interface SermonCreateRequest {
  title: string;
  preacher: string;
  preachedAt: string; // yyyy-MM-dd
  series?: string;
  scripture?: string;
  content?: string; // 마크다운, media:{id}
  videoUrl?: string;
  audioUrl?: string;
  tagIds?: number[];
}
export interface SermonUpdateRequest extends SermonCreateRequest {
  version: number;
}
export interface SermonPatchRequest {
  version: number;
  title?: string;
  preacher?: string;
  preachedAt?: string;
  series?: string;
  scripture?: string;
  content?: string;
  videoUrl?: string;
  audioUrl?: string;
  tagIds?: number[];
}

export function createSermon(body: SermonCreateRequest): Promise<SermonDetailResponse> {
  return apiMutate<SermonDetailResponse>("/api/admin/sermons", { method: "POST", body });
}
export function updateSermon(id: number, body: SermonUpdateRequest): Promise<SermonDetailResponse> {
  return apiMutate<SermonDetailResponse>(`/api/admin/sermons/${id}`, { method: "PUT", body });
}
export function patchSermon(id: number, body: SermonPatchRequest): Promise<SermonDetailResponse> {
  return apiMutate<SermonDetailResponse>(`/api/admin/sermons/${id}`, { method: "PATCH", body });
}
export function deleteSermon(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/sermons/${id}`, { method: "DELETE" });
}
```

> 주의: `SermonDetailResponse`가 sermons.ts에 이미 import돼 있는지 확인하고, 없으면 `import type { SermonDetailResponse } from "./types";` 추가. 기존 GET 함수·타입은 건드리지 않는다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/lib/api/sermons.admin.test.ts`
Expected: PASS (4 tests). 이어 `pnpm test src/lib/api/sermons.test.ts`로 기존 GET 테스트 회귀 없음 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/api/sermons.ts src/lib/api/sermons.admin.test.ts
git commit -m "feat : 설교 어드민 CRUD API(도메인-로컬 타입·version) #36"
```

---

## Task 5: 공지 어드민 API (요청 타입 + CRUD)

**Files:**
- Modify: `src/lib/api/notices.ts`(끝에 추가)
- Test: `src/lib/api/notices.admin.test.ts`

필드: Create 필수 `title`(+ content·isPinned·tagIds). PUT `title`+`version`(isPinned 미지정 시 false로 덮어씀). PATCH `version`만 필수(isPinned 토글 포함).

- [ ] **Step 1: 실패 테스트 작성**

```ts
// src/lib/api/notices.admin.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

const { apiMutateMock } = vi.hoisted(() => ({ apiMutateMock: vi.fn() }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { createNotice, updateNotice, patchNotice, deleteNotice } from "./notices";

afterEach(() => vi.clearAllMocks());

describe("공지 어드민 API", () => {
  it("createNotice은 POST /api/admin/notices로 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 3 });
    await createNotice({ title: "공지", isPinned: false });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/notices", {
      method: "POST",
      body: { title: "공지", isPinned: false },
    });
  });

  it("updateNotice은 PUT /{id}로 title+version을 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 3 });
    await updateNotice(3, { title: "공지", isPinned: true, version: 2 });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/notices/3", {
      method: "PUT",
      body: { title: "공지", isPinned: true, version: 2 },
    });
  });

  it("patchNotice은 PATCH /{id}로 isPinned 토글을 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 3 });
    await patchNotice(3, { version: 2, isPinned: true });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/notices/3", {
      method: "PATCH",
      body: { version: 2, isPinned: true },
    });
  });

  it("deleteNotice은 DELETE /{id}", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteNotice(3);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/notices/3", { method: "DELETE" });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/lib/api/notices.admin.test.ts`
Expected: FAIL — export 없음.

- [ ] **Step 3: 최소 구현 (notices.ts 끝에 추가)**

```ts
// src/lib/api/notices.ts (파일 끝에 추가). 상단 import:
//   import { apiMutate } from "@/lib/admin/apiMutate";
//   import type { NoticeDetailResponse } from "./types";   // 없으면 추가

export interface NoticeCreateRequest {
  title: string;
  content?: string;
  isPinned?: boolean;
  tagIds?: number[];
}
export interface NoticeUpdateRequest {
  title: string;
  version: number;
  content?: string;
  isPinned?: boolean;
  tagIds?: number[];
}
export interface NoticePatchRequest {
  version: number;
  title?: string;
  content?: string;
  isPinned?: boolean;
  tagIds?: number[];
}

export function createNotice(body: NoticeCreateRequest): Promise<NoticeDetailResponse> {
  return apiMutate<NoticeDetailResponse>("/api/admin/notices", { method: "POST", body });
}
export function updateNotice(id: number, body: NoticeUpdateRequest): Promise<NoticeDetailResponse> {
  return apiMutate<NoticeDetailResponse>(`/api/admin/notices/${id}`, { method: "PUT", body });
}
export function patchNotice(id: number, body: NoticePatchRequest): Promise<NoticeDetailResponse> {
  return apiMutate<NoticeDetailResponse>(`/api/admin/notices/${id}`, { method: "PATCH", body });
}
export function deleteNotice(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/notices/${id}`, { method: "DELETE" });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/lib/api/notices.admin.test.ts` → PASS (4). 이어 `pnpm test src/lib/api/notices.test.ts` 회귀 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/api/notices.ts src/lib/api/notices.admin.test.ts
git commit -m "feat : 공지 어드민 CRUD API(도메인-로컬 타입·version) #36"
```

---

## Task 6: zod 스키마 (설교·공지 폼 검증)

**Files:**
- Create: `src/components/sermons/schemas.ts`·`src/components/sermons/schemas.test.ts`
- Create: `src/components/notices/schemas.ts`·`src/components/notices/schemas.test.ts`

- [ ] **Step 1: 설교 스키마 실패 테스트**

```ts
// src/components/sermons/schemas.test.ts
import { describe, it, expect } from "vitest";
import { sermonSchema } from "./schemas";

describe("sermonSchema", () => {
  it("필수(title·preacher·preachedAt) 누락 시 실패한다", () => {
    const r = sermonSchema.safeParse({ title: "", preacher: "", preachedAt: "", content: "", tagIds: [] });
    expect(r.success).toBe(false);
  });
  it("필수가 채워지면 통과한다", () => {
    const r = sermonSchema.safeParse({
      title: "주일설교", preacher: "김목사", preachedAt: "2026-06-01",
      series: "", scripture: "", content: "", videoUrl: "", audioUrl: "", tagIds: [],
    });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/components/sermons/schemas.test.ts` → FAIL(import 없음).

- [ ] **Step 3: 설교 스키마 구현**

```ts
// src/components/sermons/schemas.ts
import { z } from "zod";

// 빈 문자열 선택 필드는 그대로 통과(전송 단계에서 undefined로 정리). 필수만 min(1).
export const sermonSchema = z.object({
  title: z.string().min(1, "제목을 입력해 주세요.").max(200),
  preacher: z.string().min(1, "설교자를 입력해 주세요.").max(100),
  preachedAt: z.string().min(1, "설교일을 선택해 주세요."),
  series: z.string().max(100).optional().default(""),
  scripture: z.string().max(200).optional().default(""),
  content: z.string().max(50000).optional().default(""),
  videoUrl: z.string().max(500).optional().default(""),
  audioUrl: z.string().max(500).optional().default(""),
  tagIds: z.array(z.number()).default([]),
});

export type SermonFormValues = z.infer<typeof sermonSchema>;
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm test src/components/sermons/schemas.test.ts` → PASS(2).

- [ ] **Step 5: 공지 스키마 실패 테스트**

```ts
// src/components/notices/schemas.test.ts
import { describe, it, expect } from "vitest";
import { noticeSchema } from "./schemas";

describe("noticeSchema", () => {
  it("title 누락 시 실패한다", () => {
    expect(noticeSchema.safeParse({ title: "", content: "", isPinned: false, tagIds: [] }).success).toBe(false);
  });
  it("title이 있으면 통과한다", () => {
    expect(
      noticeSchema.safeParse({ title: "안내", content: "", isPinned: false, tagIds: [] }).success,
    ).toBe(true);
  });
});
```

- [ ] **Step 6: 공지 스키마 구현**

```ts
// src/components/notices/schemas.ts
import { z } from "zod";

export const noticeSchema = z.object({
  title: z.string().min(1, "제목을 입력해 주세요.").max(200),
  content: z.string().max(50000).optional().default(""),
  isPinned: z.boolean().default(false),
  tagIds: z.array(z.number()).default([]),
});

export type NoticeFormValues = z.infer<typeof noticeSchema>;
```

- [ ] **Step 7: 통과 확인 + 커밋**

Run: `pnpm test src/components/sermons/schemas.test.ts src/components/notices/schemas.test.ts` → PASS(4).

```bash
git add src/components/sermons/schemas.ts src/components/sermons/schemas.test.ts \
        src/components/notices/schemas.ts src/components/notices/schemas.test.ts
git commit -m "feat : 설교·공지 폼 zod 스키마 #36"
```

---

## Task 7: SermonForm (등록·수정 폼 + useMutation)

**Files:**
- Create: `src/components/sermons/SermonForm.tsx`
- Test: `src/components/sermons/SermonForm.test.tsx`

동작: RHF+zod. 텍스트 필드=`<label htmlFor>`+`<Input id>`(Input은 자체 라벨 없음). 본문=`Controller`+`MarkdownEditor`, 태그=`Controller`+`TagMultiSelect`. 제출 시 `mode==="create"`→`createSermon`, `"edit"`→`updateSermon`(initial.version 포함). `useMutation` onError=`adminOnError({ onFieldErrors: setError, onReedit: () => router.refresh() })`, onSuccess=`notify.success("저장했습니다. 공개 페이지 반영은 최대 1분 걸릴 수 있습니다.")` + `router.push("/sermons/{id}")`.

빈 문자열 선택 필드는 전송 시 제거하는 헬퍼 `toSermonBody`를 둔다.

- [ ] **Step 1: 실패 테스트 작성**

```tsx
// src/components/sermons/SermonForm.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/auth/apiError";

const { createSermonMock, updateSermonMock, pushMock, refreshMock, notifySuccess } = vi.hoisted(() => ({
  createSermonMock: vi.fn(),
  updateSermonMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/sermons", () => ({ createSermon: createSermonMock, updateSermon: updateSermonMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, refresh: refreshMock }) }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
// 태그 옵션 fetch는 폼 테스트 범위 밖 — 빈 배열로 고정
vi.mock("@/lib/api/tags", () => ({ getTags: vi.fn().mockResolvedValue([]) }));

import { SermonForm } from "./SermonForm";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
function renderForm(ui: React.ReactNode) {
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("SermonForm", () => {
  it("필수 누락 시 검증 메시지를 보이고 제출하지 않는다", async () => {
    renderForm(<SermonForm mode="create" />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("제목을 입력해 주세요.")).toBeDefined());
    expect(createSermonMock).not.toHaveBeenCalled();
  });

  it("등록 성공 시 상세로 이동하고 지연 안내 토스트를 띄운다", async () => {
    createSermonMock.mockResolvedValue({ id: 9 });
    renderForm(<SermonForm mode="create" />);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "주일설교" } });
    fireEvent.change(screen.getByLabelText("설교자"), { target: { value: "김목사" } });
    fireEvent.change(screen.getByLabelText("설교일"), { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(createSermonMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "주일설교", preacher: "김목사", preachedAt: "2026-06-01" }),
      ),
    );
    expect(pushMock).toHaveBeenCalledWith("/sermons/9");
    expect(notifySuccess).toHaveBeenCalled();
  });

  it("수정 모드는 initial.version을 PUT body에 포함한다", async () => {
    updateSermonMock.mockResolvedValue({ id: 9 });
    const initial = {
      id: 9, title: "원본", preacher: "김목사", series: null, scripture: null,
      content: "", videoUrl: null, audioUrl: null, preachedAt: "2026-06-01",
      viewCount: 0, createdAt: "2026-06-01T00:00:00", updatedAt: "2026-06-01T00:00:00",
      version: 4, tags: [], author: null,
    };
    renderForm(<SermonForm mode="edit" initial={initial} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(updateSermonMock).toHaveBeenCalledWith(9, expect.objectContaining({ version: 4 })),
    );
  });

  it("서버 필드 에러를 해당 입력에 매핑한다", async () => {
    createSermonMock.mockRejectedValue(
      new ApiError(400, "INVALID_INPUT_VALUE", undefined, undefined, undefined, [
        { field: "title", reason: "이미 존재하는 제목입니다." },
      ]),
    );
    renderForm(<SermonForm mode="create" />);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "주일설교" } });
    fireEvent.change(screen.getByLabelText("설교자"), { target: { value: "김목사" } });
    fireEvent.change(screen.getByLabelText("설교일"), { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("이미 존재하는 제목입니다.")).toBeDefined());
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/components/sermons/SermonForm.test.tsx` → FAIL(import 없음).

- [ ] **Step 3: 구현**

```tsx
// src/components/sermons/SermonForm.tsx
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { TagMultiSelect } from "@/components/admin/TagMultiSelect";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import {
  createSermon,
  updateSermon,
  type SermonCreateRequest,
  type SermonUpdateRequest,
} from "@/lib/api/sermons";
import type { SermonDetailResponse } from "@/lib/api/types";
import { sermonSchema, type SermonFormValues } from "./schemas";

export interface SermonFormProps {
  mode: "create" | "edit";
  initial?: SermonDetailResponse;
}

// 공개 반영 지연(ISR 60초)을 표준 문구로 안내(가이드 4·15장).
const SAVED_NOTICE = "저장했습니다. 공개 페이지 반영은 최대 1분 걸릴 수 있습니다.";

// 선택 필드 빈 문자열은 전송에서 제외(PUT 전체 교체 시 의미 없는 빈값 방지).
function toBody(v: SermonFormValues): SermonCreateRequest {
  const opt = (s: string) => (s.trim() === "" ? undefined : s);
  return {
    title: v.title,
    preacher: v.preacher,
    preachedAt: v.preachedAt,
    series: opt(v.series),
    scripture: opt(v.scripture),
    content: opt(v.content),
    videoUrl: opt(v.videoUrl),
    audioUrl: opt(v.audioUrl),
    tagIds: v.tagIds,
  };
}

export function SermonForm({ mode, initial }: SermonFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<SermonFormValues>({
    resolver: zodResolver(sermonSchema),
    defaultValues: {
      title: initial?.title ?? "",
      preacher: initial?.preacher ?? "",
      preachedAt: initial?.preachedAt ?? "",
      series: initial?.series ?? "",
      scripture: initial?.scripture ?? "",
      content: initial?.content ?? "",
      videoUrl: initial?.videoUrl ?? "",
      audioUrl: initial?.audioUrl ?? "",
      tagIds: initial?.tags.map((t) => t.id) ?? [],
    },
  });

  const mutation = useMutation({
    mutationFn: (v: SermonFormValues) => {
      const body = toBody(v);
      if (mode === "edit" && initial) {
        const put: SermonUpdateRequest = { ...body, version: initial.version };
        return updateSermon(initial.id, put);
      }
      return createSermon(body);
    },
    onError: adminOnError({
      onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof SermonFormValues, { message: fe.reason })),
      onReedit: () => router.refresh(),
    }),
    onSuccess: (res) => {
      notify.success(SAVED_NOTICE);
      router.push(`/sermons/${res.id}`);
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-lg">
      <Field id="sermon-title" label="제목" error={errors.title?.message}>
        <Input id="sermon-title" error={errors.title?.message} {...register("title")} />
      </Field>
      <Field id="sermon-preacher" label="설교자" error={errors.preacher?.message}>
        <Input id="sermon-preacher" error={errors.preacher?.message} {...register("preacher")} />
      </Field>
      <Field id="sermon-preachedAt" label="설교일" error={errors.preachedAt?.message}>
        <Input id="sermon-preachedAt" type="date" error={errors.preachedAt?.message} {...register("preachedAt")} />
      </Field>
      <Field id="sermon-series" label="시리즈(선택)">
        <Input id="sermon-series" {...register("series")} />
      </Field>
      <Field id="sermon-scripture" label="본문 말씀(선택)">
        <Input id="sermon-scripture" {...register("scripture")} />
      </Field>
      <Field id="sermon-videoUrl" label="영상 링크(선택)">
        <Input id="sermon-videoUrl" {...register("videoUrl")} />
      </Field>
      <Field id="sermon-audioUrl" label="오디오 링크(선택)">
        <Input id="sermon-audioUrl" {...register("audioUrl")} />
      </Field>
      <div className="flex flex-col gap-xs">
        <span className={cn(typo.bodySm, "text-ink")}>본문(선택)</span>
        <Controller
          control={control}
          name="content"
          render={({ field }) => (
            <MarkdownEditor value={field.value} onChange={field.onChange} id="sermon-content" />
          )}
        />
      </div>
      <div className="flex flex-col gap-xs">
        <span className={cn(typo.bodySm, "text-ink")}>태그(선택)</span>
        <Controller
          control={control}
          name="tagIds"
          render={({ field }) => <TagMultiSelect value={field.value} onChange={field.onChange} />}
        />
      </div>
      <div className="flex gap-sm">
        <Button type="submit" variant="primary" loading={mutation.isPending}>저장</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>취소</Button>
      </div>
    </form>
  );
}

// 라벨+입력 묶음(Input은 자체 라벨이 없어 htmlFor로 연결).
function Field({
  id, label, error, children,
}: {
  id: string; label: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={id} className={cn(typo.bodySm, "text-ink")}>{label}</label>
      {children}
    </div>
  );
}
```

> `@hookform/resolvers/zod`·`react-hook-form`은 기존 폼(ProfileEditForm)에서 사용 중인 설치된 의존이다. `Field`의 `error`는 자식 Input이 직접 표시하므로 라벨 묶음만 담당.

- [ ] **Step 4: 통과 확인** — Run: `pnpm test src/components/sermons/SermonForm.test.tsx` → PASS(4).

- [ ] **Step 5: 커밋**

```bash
git add src/components/sermons/SermonForm.tsx src/components/sermons/SermonForm.test.tsx
git commit -m "feat : SermonForm 등록·수정 폼(낙관락·필드에러·지연안내) #36"
```

---

## Task 8: NoticeForm (등록·수정 폼 + 고정 Checkbox)

**Files:**
- Create: `src/components/notices/NoticeForm.tsx`
- Test: `src/components/notices/NoticeForm.test.tsx`

SermonForm과 동일 패턴 + 본문(MarkdownEditor)·태그(TagMultiSelect)·`isPinned` Checkbox. 필드는 title·content·isPinned·tagIds만.

- [ ] **Step 1: 실패 테스트 작성**

```tsx
// src/components/notices/NoticeForm.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { createNoticeMock, updateNoticeMock, pushMock, refreshMock, notifySuccess } = vi.hoisted(() => ({
  createNoticeMock: vi.fn(),
  updateNoticeMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/notices", () => ({ createNotice: createNoticeMock, updateNotice: updateNoticeMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, refresh: refreshMock }) }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/lib/api/tags", () => ({ getTags: vi.fn().mockResolvedValue([]) }));

import { NoticeForm } from "./NoticeForm";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
function renderForm(ui: React.ReactNode) {
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("NoticeForm", () => {
  it("title 누락 시 검증 메시지를 보인다", async () => {
    renderForm(<NoticeForm mode="create" />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("제목을 입력해 주세요.")).toBeDefined());
    expect(createNoticeMock).not.toHaveBeenCalled();
  });

  it("등록 시 isPinned를 포함해 전송하고 상세로 이동한다", async () => {
    createNoticeMock.mockResolvedValue({ id: 5 });
    renderForm(<NoticeForm mode="create" />);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "주차 안내" } });
    fireEvent.click(screen.getByLabelText("상단 고정"));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(createNoticeMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "주차 안내", isPinned: true }),
      ),
    );
    expect(pushMock).toHaveBeenCalledWith("/notices/5");
  });

  it("수정 모드는 initial.version을 PUT body에 포함한다", async () => {
    updateNoticeMock.mockResolvedValue({ id: 5 });
    const initial = {
      id: 5, title: "원본", content: "", isPinned: false, viewCount: 0,
      createdAt: "2026-06-01T00:00:00", updatedAt: "2026-06-01T00:00:00",
      version: 2, tags: [], author: null,
    };
    renderForm(<NoticeForm mode="edit" initial={initial} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(updateNoticeMock).toHaveBeenCalledWith(5, expect.objectContaining({ version: 2 })),
    );
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/components/notices/NoticeForm.test.tsx` → FAIL.

- [ ] **Step 3: 구현**

```tsx
// src/components/notices/NoticeForm.tsx
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { TagMultiSelect } from "@/components/admin/TagMultiSelect";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import {
  createNotice,
  updateNotice,
  type NoticeCreateRequest,
  type NoticeUpdateRequest,
} from "@/lib/api/notices";
import type { NoticeDetailResponse } from "@/lib/api/types";
import { noticeSchema, type NoticeFormValues } from "./schemas";

export interface NoticeFormProps {
  mode: "create" | "edit";
  initial?: NoticeDetailResponse;
}

const SAVED_NOTICE = "저장했습니다. 공개 페이지 반영은 최대 1분 걸릴 수 있습니다.";

function toBody(v: NoticeFormValues): NoticeCreateRequest {
  return {
    title: v.title,
    content: v.content.trim() === "" ? undefined : v.content,
    isPinned: v.isPinned,
    tagIds: v.tagIds,
  };
}

export function NoticeForm({ mode, initial }: NoticeFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<NoticeFormValues>({
    resolver: zodResolver(noticeSchema),
    defaultValues: {
      title: initial?.title ?? "",
      content: initial?.content ?? "",
      isPinned: initial?.isPinned ?? false,
      tagIds: initial?.tags.map((t) => t.id) ?? [],
    },
  });

  const mutation = useMutation({
    mutationFn: (v: NoticeFormValues) => {
      const body = toBody(v);
      if (mode === "edit" && initial) {
        const put: NoticeUpdateRequest = { ...body, version: initial.version };
        return updateNotice(initial.id, put);
      }
      return createNotice(body);
    },
    onError: adminOnError({
      onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof NoticeFormValues, { message: fe.reason })),
      onReedit: () => router.refresh(),
    }),
    onSuccess: (res) => {
      notify.success(SAVED_NOTICE);
      router.push(`/notices/${res.id}`);
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        <label htmlFor="notice-title" className={cn(typo.bodySm, "text-ink")}>제목</label>
        <Input id="notice-title" error={errors.title?.message} {...register("title")} />
      </div>
      <Controller
        control={control}
        name="isPinned"
        render={({ field }) => (
          <Checkbox
            label="상단 고정"
            checked={field.value}
            onChange={(e) => field.onChange(e.target.checked)}
          />
        )}
      />
      <div className="flex flex-col gap-xs">
        <span className={cn(typo.bodySm, "text-ink")}>본문(선택)</span>
        <Controller
          control={control}
          name="content"
          render={({ field }) => (
            <MarkdownEditor value={field.value} onChange={field.onChange} id="notice-content" />
          )}
        />
      </div>
      <div className="flex flex-col gap-xs">
        <span className={cn(typo.bodySm, "text-ink")}>태그(선택)</span>
        <Controller
          control={control}
          name="tagIds"
          render={({ field }) => <TagMultiSelect value={field.value} onChange={field.onChange} />}
        />
      </div>
      <div className="flex gap-sm">
        <Button type="submit" variant="primary" loading={mutation.isPending}>저장</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>취소</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm test src/components/notices/NoticeForm.test.tsx` → PASS(3).

- [ ] **Step 5: 커밋**

```bash
git add src/components/notices/NoticeForm.tsx src/components/notices/NoticeForm.test.tsx
git commit -m "feat : NoticeForm 등록·수정 폼(상단 고정 Checkbox) #36"
```

---

## Task 9: 설교 편집 라우트 (new·edit)

**Files:**
- Create: `src/app/(site)/sermons/new/page.tsx`
- Create: `src/app/(site)/sermons/[id]/edit/page.tsx`
- Create: `src/components/admin/EditGate.tsx`(권한 미보유 fallback 공용)
- Test: `src/components/admin/EditGate.test.tsx`

new=데이터 없음, edit=서버에서 `getSermon` 프리필(설계 §7 view+1 수용). 둘 다 `RequirePermission permission="SERMON_WRITE"`로 게이트. 미보유 fallback은 공용 `EditGate` 안내.

- [ ] **Step 1: EditGate 실패 테스트**

```tsx
// src/components/admin/EditGate.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditAccessDenied } from "./EditGate";

describe("EditAccessDenied", () => {
  it("권한 안내 문구를 보인다", () => {
    render(<EditAccessDenied />);
    expect(screen.getByText("이 페이지를 열 권한이 없습니다.")).toBeDefined();
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/components/admin/EditGate.test.tsx` → FAIL.

- [ ] **Step 3: EditGate 구현**

```tsx
// src/components/admin/EditGate.tsx
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

// 편집 라우트에서 권한 미보유 시 RequirePermission fallback으로 사용.
export function EditAccessDenied() {
  return (
    <p className={cn(typo.bodyMd, "text-muted")}>이 페이지를 열 권한이 없습니다.</p>
  );
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm test src/components/admin/EditGate.test.tsx` → PASS.

- [ ] **Step 5: 라우트 페이지 작성(테스트 없음 — 얇은 조립 RSC, 검증은 Task 13 빌드)**

```tsx
// src/app/(site)/sermons/new/page.tsx
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { SermonForm } from "@/components/sermons/SermonForm";

export default function SermonNewPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">설교 등록</h1>
      <RequirePermission permission="SERMON_WRITE" fallback={<EditAccessDenied />}>
        <SermonForm mode="create" />
      </RequirePermission>
    </Container>
  );
}
```

```tsx
// src/app/(site)/sermons/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { SermonForm } from "@/components/sermons/SermonForm";
import { getSermon } from "@/lib/api/sermons";

export default async function SermonEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sermon = await getSermon(Number(id));
  if (!sermon) notFound();
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">설교 수정</h1>
      <RequirePermission permission="SERMON_WRITE" fallback={<EditAccessDenied />}>
        <SermonForm mode="edit" initial={sermon} />
      </RequirePermission>
    </Container>
  );
}
```

> `Container`는 `@/components/shell/Container`(공개 `sermons/page.tsx`와 동일 경로, `as`/`className` props 지원). `@/components/layout/`은 존재하지 않으니 주의.

- [ ] **Step 6: 타입·빌드 확인 + 커밋**

Run: `npx tsc --noEmit` → 0 errors.

```bash
git add src/components/admin/EditGate.tsx src/components/admin/EditGate.test.tsx \
        "src/app/(site)/sermons/new/page.tsx" "src/app/(site)/sermons/[id]/edit/page.tsx"
git commit -m "feat : 설교 등록·수정 전용 라우트(/sermons/new·/[id]/edit) #36"
```

---

## Task 10: 공지 편집 라우트 (new·edit)

**Files:**
- Create: `src/app/(site)/notices/new/page.tsx`
- Create: `src/app/(site)/notices/[id]/edit/page.tsx`

Task 9와 동일 패턴(권한 `NOTICE_WRITE`, 폼 `NoticeForm`, 프리필 `getNotice`).

- [ ] **Step 1: new 페이지**

```tsx
// src/app/(site)/notices/new/page.tsx
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { NoticeForm } from "@/components/notices/NoticeForm";

export default function NoticeNewPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">공지 등록</h1>
      <RequirePermission permission="NOTICE_WRITE" fallback={<EditAccessDenied />}>
        <NoticeForm mode="create" />
      </RequirePermission>
    </Container>
  );
}
```

- [ ] **Step 2: edit 페이지**

```tsx
// src/app/(site)/notices/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { NoticeForm } from "@/components/notices/NoticeForm";
import { getNotice } from "@/lib/api/notices";

export default async function NoticeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notice = await getNotice(Number(id));
  if (!notice) notFound();
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">공지 수정</h1>
      <RequirePermission permission="NOTICE_WRITE" fallback={<EditAccessDenied />}>
        <NoticeForm mode="edit" initial={notice} />
      </RequirePermission>
    </Container>
  );
}
```

- [ ] **Step 3: 타입 확인 + 커밋**

Run: `npx tsc --noEmit` → 0.

```bash
git add "src/app/(site)/notices/new/page.tsx" "src/app/(site)/notices/[id]/edit/page.tsx"
git commit -m "feat : 공지 등록·수정 전용 라우트(/notices/new·/[id]/edit) #36"
```

---

## Task 11: 설교 인라인 액션 island + 공개 페이지 주입

**Files:**
- Create: `src/components/sermons/SermonAdminActions.tsx`
- Test: `src/components/sermons/SermonAdminActions.test.tsx`
- Modify: `src/app/(site)/sermons/page.tsx`(목록 toolbar), `src/app/(site)/sermons/[id]/page.tsx`(상세 액션)

두 export: `SermonListAction`(목록 '새 설교' Link, `RequirePermission` 게이트) / `SermonDetailActions`({id,version}: 수정 Link + 삭제 버튼 → `DeleteConfirmDialog` → `deleteSermon` → 목록 이동).

- [ ] **Step 1: 실패 테스트 작성**

```tsx
// src/components/sermons/SermonAdminActions.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { useMeMock, deleteSermonMock, pushMock } = vi.hoisted(() => ({
  useMeMock: vi.fn(),
  deleteSermonMock: vi.fn(),
  pushMock: vi.fn(),
}));
// RequirePermission이 의존하는 useMe를 제어
vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock }));
vi.mock("@/lib/api/sermons", () => ({ deleteSermon: deleteSermonMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, refresh: vi.fn() }) }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

import { SermonListAction, SermonDetailActions } from "./SermonAdminActions";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
function renderWithQc(ui: React.ReactNode) {
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("SermonListAction", () => {
  it("SERMON_WRITE 보유 시 '새 설교' 링크를 노출한다", () => {
    useMeMock.mockReturnValue({ data: { permissions: ["SERMON_WRITE"] }, isLoading: false });
    renderWithQc(<SermonListAction />);
    expect(screen.getByText("새 설교").closest("a")?.getAttribute("href")).toBe("/sermons/new");
  });

  it("권한 미보유 시 아무것도 렌더하지 않는다", () => {
    useMeMock.mockReturnValue({ data: { permissions: [] }, isLoading: false });
    renderWithQc(<SermonListAction />);
    expect(screen.queryByText("새 설교")).toBeNull();
  });
});

describe("SermonDetailActions", () => {
  it("삭제 확정 시 deleteSermon 후 목록으로 이동한다", async () => {
    useMeMock.mockReturnValue({ data: { permissions: ["SERMON_WRITE"] }, isLoading: false });
    deleteSermonMock.mockResolvedValue(undefined);
    renderWithQc(<SermonDetailActions id={9} />);
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    // 다이얼로그 확정 버튼(라벨 동일 '삭제')
    const confirmButtons = screen.getAllByRole("button", { name: "삭제" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    await waitFor(() => expect(deleteSermonMock).toHaveBeenCalledWith(9));
    expect(pushMock).toHaveBeenCalledWith("/sermons");
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/components/sermons/SermonAdminActions.test.tsx` → FAIL.

- [ ] **Step 3: 구현**

```tsx
// src/components/sermons/SermonAdminActions.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Button, buttonVariants } from "@/components/ui/Button";
import { deleteSermon } from "@/lib/api/sermons";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";

export function SermonListAction() {
  return (
    <RequirePermission permission="SERMON_WRITE">
      <Link href="/sermons/new" className={buttonVariants("primary")}>새 설교</Link>
    </RequirePermission>
  );
}

export function SermonDetailActions({ id }: { id: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const remove = useMutation({
    mutationFn: () => deleteSermon(id),
    onError: adminOnError(),
    onSuccess: () => {
      notify.success("삭제했습니다. 공개 페이지 반영은 최대 1분 걸릴 수 있습니다.");
      setOpen(false);
      router.push("/sermons");
    },
  });
  return (
    <RequirePermission permission="SERMON_WRITE">
      <div className="flex gap-sm">
        <Link href={`/sermons/${id}/edit`} className={buttonVariants("secondary")}>수정</Link>
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>삭제</Button>
      </div>
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="설교를 삭제할까요?"
        warning="삭제하면 공개 목록에서 사라집니다."
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </RequirePermission>
  );
}
```

> 설교 삭제는 DELETE라 `version`이 불필요하므로 `SermonDetailActions`는 `{ id }`만 받는다(YAGNI). 공지는 고정 토글(PATCH)에 `version`이 필요해 Task 12에서 `{ id, version, isPinned }`로 받는다.

- [ ] **Step 4: 통과 확인** — Run: `pnpm test src/components/sermons/SermonAdminActions.test.tsx` → PASS(3).

- [ ] **Step 5: 공개 페이지 주입(파일 열어 정확 위치에 삽입)**

`src/app/(site)/sermons/page.tsx`: 상단 `import { SermonListAction } from "@/components/sermons/SermonAdminActions";` 추가 후, `<h1 …>설교</h1>`를 감싸 우측에 액션 배치:

```tsx
// 변경 전: <h1 className={cn(typo.displayMd, "text-ink")}>설교</h1>
// 변경 후:
<div className="flex items-center justify-between gap-base">
  <h1 className={cn(typo.displayMd, "text-ink")}>설교</h1>
  <SermonListAction />
</div>
```

`src/app/(site)/sermons/[id]/page.tsx`: 상단 `import { SermonDetailActions } from "@/components/sermons/SermonAdminActions";` 추가 후, 제목 h1 직후(메타 라인 위 또는 '◀ 목록' Link 행 우측)에 삽입:

```tsx
<SermonDetailActions id={sermon.id} />
```

- [ ] **Step 6: 검증 + 커밋**

Run: `npx tsc --noEmit` → 0. `pnpm test src/components/sermons` → 전 통과.

```bash
git add src/components/sermons/SermonAdminActions.tsx src/components/sermons/SermonAdminActions.test.tsx \
        "src/app/(site)/sermons/page.tsx" "src/app/(site)/sermons/[id]/page.tsx"
git commit -m "feat : 설교 인라인 액션(목록 등록·상세 수정/삭제) #36"
```

---

## Task 12: 공지 인라인 액션 island(+고정 토글) + 주입

**Files:**
- Create: `src/components/notices/NoticeAdminActions.tsx`
- Test: `src/components/notices/NoticeAdminActions.test.tsx`
- Modify: `src/app/(site)/notices/page.tsx`, `src/app/(site)/notices/[id]/page.tsx`

`NoticeListAction`(새 공지) / `NoticeDetailActions`({id, version, isPinned}: 수정 Link + 삭제 + **고정 토글** Checkbox → `patchNotice({version, isPinned:!isPinned})` → `router.refresh`).

- [ ] **Step 1: 실패 테스트 작성**

```tsx
// src/components/notices/NoticeAdminActions.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { useMeMock, patchNoticeMock, deleteNoticeMock, refreshMock, pushMock } = vi.hoisted(() => ({
  useMeMock: vi.fn(),
  patchNoticeMock: vi.fn(),
  deleteNoticeMock: vi.fn(),
  refreshMock: vi.fn(),
  pushMock: vi.fn(),
}));
vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock }));
vi.mock("@/lib/api/notices", () => ({ patchNotice: patchNoticeMock, deleteNotice: deleteNoticeMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, refresh: refreshMock }) }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

import { NoticeDetailActions } from "./NoticeAdminActions";

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useMeMock.mockReturnValue({ data: { permissions: ["NOTICE_WRITE"] }, isLoading: false });
});
afterEach(() => vi.clearAllMocks());
function renderWithQc(ui: React.ReactNode) {
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("NoticeDetailActions", () => {
  it("고정 토글을 누르면 patchNotice로 반대 isPinned+version을 보낸다", async () => {
    patchNoticeMock.mockResolvedValue({ id: 5 });
    renderWithQc(<NoticeDetailActions id={5} version={2} isPinned={false} />);
    fireEvent.click(screen.getByLabelText("상단 고정"));
    await waitFor(() =>
      expect(patchNoticeMock).toHaveBeenCalledWith(5, { version: 2, isPinned: true }),
    );
    expect(refreshMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/components/notices/NoticeAdminActions.test.tsx` → FAIL.

- [ ] **Step 3: 구현**

```tsx
// src/components/notices/NoticeAdminActions.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { patchNotice, deleteNotice } from "@/lib/api/notices";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";

const DELAY_NOTICE = "공개 페이지 반영은 최대 1분 걸릴 수 있습니다.";

export function NoticeListAction() {
  return (
    <RequirePermission permission="NOTICE_WRITE">
      <Link href="/notices/new" className={buttonVariants("primary")}>새 공지</Link>
    </RequirePermission>
  );
}

export function NoticeDetailActions({
  id, version, isPinned,
}: {
  id: number; version: number; isPinned: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const pin = useMutation({
    mutationFn: () => patchNotice(id, { version, isPinned: !isPinned }),
    onError: adminOnError({ onReedit: () => router.refresh() }),
    onSuccess: () => router.refresh(),
  });
  const remove = useMutation({
    mutationFn: () => deleteNotice(id),
    onError: adminOnError(),
    onSuccess: () => {
      notify.success(`삭제했습니다. ${DELAY_NOTICE}`);
      setOpen(false);
      router.push("/notices");
    },
  });

  return (
    <RequirePermission permission="NOTICE_WRITE">
      <div className="flex flex-wrap items-center gap-base">
        <Checkbox
          label="상단 고정"
          checked={isPinned}
          disabled={pin.isPending}
          onChange={() => pin.mutate()}
        />
        <Link href={`/notices/${id}/edit`} className={buttonVariants("secondary")}>수정</Link>
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>삭제</Button>
      </div>
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="공지를 삭제할까요?"
        warning="삭제하면 공개 목록에서 사라집니다."
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </RequirePermission>
  );
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm test src/components/notices/NoticeAdminActions.test.tsx` → PASS.

- [ ] **Step 5: 공개 페이지 주입**

`src/app/(site)/notices/page.tsx`: `import { NoticeListAction } …` 후 h1 행을 flex로 감싸 우측에 `<NoticeListAction />`(Task 11 설교 목록과 동일 패턴).

`src/app/(site)/notices/[id]/page.tsx`: `import { NoticeDetailActions } …` 후 제목/메타 근처에 삽입:

```tsx
<NoticeDetailActions id={notice.id} version={notice.version} isPinned={notice.isPinned} />
```

- [ ] **Step 6: 검증 + 커밋**

Run: `npx tsc --noEmit` → 0. `pnpm test src/components/notices` → 통과.

```bash
git add src/components/notices/NoticeAdminActions.tsx src/components/notices/NoticeAdminActions.test.tsx \
        "src/app/(site)/notices/page.tsx" "src/app/(site)/notices/[id]/page.tsx"
git commit -m "feat : 공지 인라인 액션(등록·수정/삭제·고정 토글) #36"
```

---

## Task 13: DESIGN.md 등록 + 전체 검증

**Files:**
- Modify: `.claude/rules/DESIGN.md`(`<!-- admin:02 -->` 마커 아래만)

- [ ] **Step 1: DESIGN.md 02 구획에 3항목 append**

`<!-- admin:02 콘텐츠(설교·공지) — markdown-editor · tag-multiselect · admin-inline-action -->` **바로 아래**에 추가(다른 구획 라인 불가침):

```markdown
- **`markdown-editor`**: 어드민 본문 작성/미리보기 탭 에디터. `Tabs`(작성·미리보기) + `Textarea` + `MarkdownContent`(미리보기 재사용). 미리보기는 탭 활성 시에만 변환. 토큰 공유(가독성 우선 단순 변형).
- **`tag-multiselect`**: 기존 태그 다중선택. `Popover` + `Checkbox` 목록 + 선택 `Badge` 칩. 옵션은 `getTags`. 신규 생성 없음(06 소관).
- **`admin-inline-action`**: 공개 RSC 페이지 위 client island(목록 toolbar 등록 버튼·상세 수정/삭제·공지 고정 토글). `RequirePermission` 게이트, 카드 내부 중첩 `<a>` 금지(목록 액션은 카드 밖).
```

- [ ] **Step 2: 전체 테스트 통과**

Run: `pnpm test`
Expected: 기존 515 + 02 신규 전부 PASS, 0 fail.

- [ ] **Step 3: 타입·린트·빌드**

Run: `npx tsc --noEmit` → 0 errors.
Run: `pnpm lint` → 0 errors.
Run: `pnpm build` → 성공(신규 라우트 `/sermons/new`·`/sermons/[id]/edit`·`/notices/new`·`/notices/[id]/edit` 포함).

- [ ] **Step 4: 완료 기준 점검(설계 §11)**

- [ ] hex·px 인라인 0 · `typo.*` 사용 · UI 이모지 0 · 아이콘 lucide만 · JSX 조건부 삼항
- [ ] `MarkdownEditor`·`TagMultiSelect`·`Textarea` 인터페이스 확정(03·05 소비 가능)
- [ ] 설교·공지 등록·수정(PUT)·삭제·공지 고정(PATCH) 동작
- [ ] 낙관락 onReedit·검증 setError·지연 안내 토스트

- [ ] **Step 5: 커밋**

```bash
git add .claude/rules/DESIGN.md
git commit -m "docs : DESIGN.md 어드민 02 컴포넌트 3종 등록 #36"
```

---

## 자기 검토 메모(작성자)

- **스펙 커버리지**: 설계 §3 모듈 전부 태스크 매핑(Textarea=T1, MarkdownEditor=T2, TagMultiSelect=T3, sermons API=T4, notices API=T5, 스키마=T6, 폼=T7·T8, 라우트=T9·T10, 인라인 액션=T11·T12, DESIGN 등록=T13). 이연 항목(미디어 첨부·태그 생성)은 미포함(의도).
- **타입 일관성**: `SermonCreateRequest`/`SermonUpdateRequest`/`SermonPatchRequest`·`Notice*Request`가 T4/T5 정의 → T7/T8 폼에서 동일 사용. `MarkdownEditorProps`(value/onChange/id/error)·`TagMultiSelectProps`(value:number[]/onChange)가 T2/T3 정의 → T7/T8 Controller에서 동일 사용. `SermonDetailActions`는 `{id}`만(version 미사용 확정), `NoticeDetailActions`는 `{id,version,isPinned}`.
- **검증 필요(구현 시 실측)**: `Container` import 경로, RHF `setError`의 `fe.field` 캐스팅(`as keyof …`), `getSermon`/`getNotice` 클라이언트 외 서버 프리필 동작.
