# 어드민 03 일정 등록·수정·삭제 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 권한 보유 운영자가 공개 캘린더·상세/모달에서 팝업 Dialog 폼으로 일정을 등록·수정·삭제한다.

**Architecture:** 공개 RSC 페이지(ISR) 위 `'use client'` 액션 island + 팝업 Dialog 폼(RHF+zod). 어드민 쓰기는 `apiMutate`+`useMutation`, 게이팅은 `RequirePermission`(`EVENT_WRITE`). 03은 `DateTimePicker`(네이티브 `datetime-local`, date-fns 없이) 단독 생산, 02의 `MarkdownEditor`·`TagMultiSelect`·인라인 패턴·`.admin.ts` 분리 소비.

**Tech Stack:** Next.js(App Router) · TypeScript · TanStack Query · react-hook-form + zod · Radix Dialog 재스킨 · vitest + @testing-library/react(jsdom, `fireEvent`).

**소스 진실:** 설계 `docs/superpowers/specs/2026-06-14-admin-03-events-design.md` · `docs/api-docs.json`.

**공통 테스트 관례(전 태스크):** vitest `globals:false` → `import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"`. RTL `import { render, screen, fireEvent, waitFor } from "@testing-library/react"`. **jest-dom 없음** → `.getAttribute()`·`.toBeDefined()`·`.toBeNull()`·`container.querySelector`. `vi.mock`+`vi.hoisted`. 쿼리/뮤테이션 컴포넌트는 `<QueryClientProvider client={new QueryClient({ defaultOptions:{ queries:{ retry:false } } })}>`로 감싼다. `ApiError(status, errorCode, detail, title, instance, errors, references)`. **Radix Dialog 열기는 트리거 `fireEvent.click` 또는 제어 `open` prop**(Dialog는 일반 button 트리거라 click 동작).

**커밋 규칙:** `<type> : <desc> #37`(Co-Authored-By 금지). worktree `.worktrees/37-events`, 브랜치 `20260614_#37_일정_등록_수정_삭제`.

---

## File Structure

- Modify `src/lib/date.ts` — `toServerDateTime`·`toLocalInput` 추가(기존 함수 변경 금지)
- Create `src/components/admin/DateTimePicker.tsx` — 네이티브 datetime-local/date 래퍼(03 단독 생산)
- Create `src/lib/api/events.admin.ts` — 요청 타입 + create/update/delete(서버 import 금지)
- Create `src/components/events/schemas.ts` — zod
- Create `src/components/events/EventFormDialog.tsx` — 팝업 Dialog 폼
- Create `src/components/events/EventAdminActions.tsx` — list/detail 액션 island
- Modify `src/app/(site)/events/page.tsx`·`[id]/page.tsx`, `src/components/events/EventDetailModal.tsx` — island 주입
- Modify `.claude/rules/DESIGN.md` — `admin:03` 마커 아래 2항목

---

## Task 1: 날짜 직렬화 유틸 (toServerDateTime · toLocalInput)

**Files:**
- Modify: `src/lib/date.ts`(끝에 추가)
- Test: `src/lib/date.admin.test.ts`

서버는 offset 없는 LocalDateTime. 쓰기 경로는 naive 그대로(offset 부착 금지). `datetime-local`은 분 단위라 `:00` 보강.

- [ ] **Step 1: 실패 테스트 작성**

```ts
// src/lib/date.admin.test.ts
import { describe, it, expect } from "vitest";
import { toServerDateTime, toLocalInput, parseServerDate } from "./date";

describe("toServerDateTime", () => {
  it("datetime-local(분 단위)에 초를 보강한다", () => {
    expect(toServerDateTime("2026-06-14T10:00")).toBe("2026-06-14T10:00:00");
  });
  it("allDay면 날짜만 자정으로 직렬화한다", () => {
    expect(toServerDateTime("2026-06-14", true)).toBe("2026-06-14T00:00:00");
  });
  it("datetime-local 값에도 allDay면 날짜 부분만 쓴다", () => {
    expect(toServerDateTime("2026-06-14T10:00", true)).toBe("2026-06-14T00:00:00");
  });
  it("빈 값은 빈 문자열", () => {
    expect(toServerDateTime("")).toBe("");
  });
});

describe("toLocalInput", () => {
  it("서버 문자열을 datetime-local로 슬라이스한다", () => {
    expect(toLocalInput("2026-06-14T10:00:00")).toBe("2026-06-14T10:00");
  });
  it("allDay면 날짜만 슬라이스한다", () => {
    expect(toLocalInput("2026-06-14T00:00:00", true)).toBe("2026-06-14");
  });
  it("빈 값은 빈 문자열", () => {
    expect(toLocalInput("")).toBe("");
  });
});

describe("round-trip", () => {
  it("toServerDateTime 결과를 parseServerDate가 동일 KST로 읽는다", () => {
    const server = toServerDateTime("2026-06-14T10:00");
    expect(parseServerDate(server).getTime()).toBe(Date.UTC(2026, 5, 14, 1, 0, 0)); // 10:00 KST = 01:00 UTC
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/lib/date.admin.test.ts` → FAIL(export 없음).

- [ ] **Step 3: 구현 (date.ts 끝에 추가)**

```ts
// src/lib/date.ts (파일 끝에 추가)

// 쓰기 경로: 폼의 datetime-local/date 값 → 서버 offset 없는 LocalDateTime 문자열.
// 읽기의 parseServerDate(+09:00 부착)와 대칭으로, 쓰기는 offset을 붙이지 않고 KST naive 그대로 둔다.
export function toServerDateTime(local: string, allDay = false): string {
  if (!local) return "";
  if (allDay) return `${local.slice(0, 10)}T00:00:00`;
  const withSeconds = local.length === 16 ? `${local}:00` : local; // 분 단위면 초 보강
  return withSeconds.length === 10 ? `${withSeconds}T00:00:00` : withSeconds; // date만 온 경우 방어
}

// 편집 프리필: 서버 LocalDateTime 문자열 → datetime-local(앞 16자) 또는 date(앞 10자) 입력값.
// parseServerDate(Date 변환)를 거치지 않아야 런타임 TZ가 섞이지 않는다.
export function toLocalInput(serverIso: string, allDay = false): string {
  if (!serverIso) return "";
  return allDay ? serverIso.slice(0, 10) : serverIso.slice(0, 16);
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm test src/lib/date.admin.test.ts` → PASS. 기존 `src/lib/date.test.ts` 회귀 없음 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/date.ts src/lib/date.admin.test.ts
git commit -m "feat : 일정 쓰기용 날짜 직렬화 toServerDateTime·toLocalInput #37"
```

---

## Task 2: DateTimePicker (네이티브 datetime-local/date 래퍼)

**Files:**
- Create: `src/components/admin/DateTimePicker.tsx`
- Test: `src/components/admin/DateTimePicker.test.tsx`

의존(기존): `@/components/ui/Input`(forwardRef, `type` prop 전달, `error` 배선). allDay 시 `type="date"`로 전환하고 표시값을 날짜로 슬라이스.

- [ ] **Step 1: 실패 테스트 작성**

```tsx
// src/components/admin/DateTimePicker.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { DateTimePicker } from "./DateTimePicker";

describe("DateTimePicker", () => {
  it("기본은 datetime-local 입력", () => {
    const { container } = render(<DateTimePicker value="2026-06-14T10:00" onChange={() => {}} />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.getAttribute("type")).toBe("datetime-local");
    expect(input.value).toBe("2026-06-14T10:00");
  });

  it("allDay면 date 입력이고 값은 날짜로 슬라이스된다", () => {
    const { container } = render(<DateTimePicker value="2026-06-14T10:00" allDay onChange={() => {}} />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.getAttribute("type")).toBe("date");
    expect(input.value).toBe("2026-06-14");
  });

  it("입력 변경 시 onChange로 값을 올린다", () => {
    const onChange = vi.fn();
    const { container } = render(<DateTimePicker value="" onChange={onChange} />);
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2026-06-14T09:30" } });
    expect(onChange).toHaveBeenCalledWith("2026-06-14T09:30");
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/components/admin/DateTimePicker.test.tsx` → FAIL.

- [ ] **Step 3: 구현**

```tsx
// src/components/admin/DateTimePicker.tsx
"use client";

import { Input } from "@/components/ui/Input";

export interface DateTimePickerProps {
  value: string; // datetime-local("YYYY-MM-DDTHH:mm") 또는 date("YYYY-MM-DD")
  onChange: (value: string) => void;
  allDay?: boolean;
  id?: string;
  error?: string;
}

// date-fns 없이 네이티브 입력만 사용. allDay면 date 입력 + 값 날짜 슬라이스.
// naive 값을 그대로 다루고 직렬화는 toServerDateTime가 담당(TZ 미개입).
export function DateTimePicker({ value, onChange, allDay = false, id, error }: DateTimePickerProps) {
  const shown = allDay ? value.slice(0, 10) : value;
  return (
    <Input
      id={id}
      type={allDay ? "date" : "datetime-local"}
      value={shown}
      onChange={(e) => onChange(e.target.value)}
      error={error}
    />
  );
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm test src/components/admin/DateTimePicker.test.tsx` → PASS(3).

- [ ] **Step 5: 커밋**

```bash
git add src/components/admin/DateTimePicker.tsx src/components/admin/DateTimePicker.test.tsx
git commit -m "feat : DateTimePicker 네이티브 datetime-local/date 래퍼(03 단독 생산) #37"
```

---

## Task 3: 일정 어드민 API (events.admin.ts)

**Files:**
- Create: `src/lib/api/events.admin.ts`
- Test: `src/lib/api/events.admin.test.ts`

`sermons.admin.ts` 패턴 1:1. `endAfterStart`·`patchEvent` 제외(YAGNI). 서버 컴포넌트 import 금지 주석.

- [ ] **Step 1: 실패 테스트 작성**

```ts
// src/lib/api/events.admin.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

const { apiMutateMock } = vi.hoisted(() => ({ apiMutateMock: vi.fn() }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { createEvent, updateEvent, deleteEvent } from "./events.admin";

afterEach(() => vi.clearAllMocks());

describe("일정 어드민 API", () => {
  it("createEvent은 POST /api/admin/events로 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 4 });
    await createEvent({ title: "수련회", startAt: "2026-06-14T10:00:00" });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/events", {
      method: "POST",
      body: { title: "수련회", startAt: "2026-06-14T10:00:00" },
    });
  });

  it("updateEvent은 PUT /{id}로 version 포함 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 4 });
    await updateEvent(4, { title: "수련회", startAt: "2026-06-14T10:00:00", version: 2 });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/events/4", {
      method: "PUT",
      body: { title: "수련회", startAt: "2026-06-14T10:00:00", version: 2 },
    });
  });

  it("deleteEvent은 DELETE /{id}", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteEvent(4);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/events/4", { method: "DELETE" });
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/lib/api/events.admin.test.ts` → FAIL.

- [ ] **Step 3: 구현**

```ts
// src/lib/api/events.admin.ts
// 어드민 일정 쓰기. 이 파일을 서버 컴포넌트에서 직접 import하면 authFetch·authStore 체인이
// 서버 번들에 포함되어 빌드 오류가 난다 — client 컴포넌트에서만 호출한다(RSC 번들 경계).
import { apiMutate } from "@/lib/admin/apiMutate";
import type { EventDetailResponse } from "./types";

export interface EventCreateRequest {
  title: string; // 필수, ≤200
  startAt: string; // 필수, LocalDateTime(offset 없음)
  description?: string; // 마크다운, ≤50000
  location?: string; // ≤200
  endAt?: string; // 없으면 점 이벤트
  allDay?: boolean;
  tagIds?: number[];
}
export interface EventUpdateRequest extends EventCreateRequest {
  version: number; // 낙관락
}

export function createEvent(body: EventCreateRequest): Promise<EventDetailResponse> {
  return apiMutate<EventDetailResponse>("/api/admin/events", { method: "POST", body });
}
export function updateEvent(id: number, body: EventUpdateRequest): Promise<EventDetailResponse> {
  return apiMutate<EventDetailResponse>(`/api/admin/events/${id}`, { method: "PUT", body });
}
export function deleteEvent(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/events/${id}`, { method: "DELETE" });
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm test src/lib/api/events.admin.test.ts` → PASS(3).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/api/events.admin.ts src/lib/api/events.admin.test.ts
git commit -m "feat : 일정 어드민 CRUD API(events.admin.ts, .admin 분리) #37"
```

---

## Task 4: 일정 폼 zod 스키마

**Files:**
- Create: `src/components/events/schemas.ts`
- Test: `src/components/events/schemas.test.ts`

`datetime-local`/`date` 문자열은 0-패딩이라 사전식 비교 = 시간순. 종료>시작 refine.

- [ ] **Step 1: 실패 테스트 작성**

```ts
// src/components/events/schemas.test.ts
import { describe, it, expect } from "vitest";
import { eventSchema } from "./schemas";

const base = { title: "수련회", startAt: "2026-06-14T10:00", endAt: "", allDay: false, location: "", description: "", tagIds: [] };

describe("eventSchema", () => {
  it("title·startAt 누락 시 실패", () => {
    expect(eventSchema.safeParse({ ...base, title: "", startAt: "" }).success).toBe(false);
  });
  it("필수가 있으면 통과(종료 비움=점 이벤트)", () => {
    expect(eventSchema.safeParse(base).success).toBe(true);
  });
  it("종료가 시작보다 이전이면 실패", () => {
    expect(eventSchema.safeParse({ ...base, endAt: "2026-06-14T09:00" }).success).toBe(false);
  });
  it("종료가 시작보다 이후면 통과", () => {
    expect(eventSchema.safeParse({ ...base, endAt: "2026-06-14T12:00" }).success).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/components/events/schemas.test.ts` → FAIL.

- [ ] **Step 3: 구현**

```ts
// src/components/events/schemas.ts
import { z } from "zod";

// datetime-local/date 문자열은 0-패딩 ISO 형태라 사전식 비교가 시간순과 일치(동일 포맷 전제).
export const eventSchema = z
  .object({
    title: z.string().min(1, "제목을 입력해 주세요.").max(200),
    startAt: z.string().min(1, "시작 일시를 선택해 주세요."),
    endAt: z.string().optional().default(""),
    allDay: z.boolean().default(false),
    location: z.string().max(200).optional().default(""),
    description: z.string().max(50000).optional().default(""),
    tagIds: z.array(z.number()).default([]),
  })
  .refine((v) => v.endAt === "" || v.endAt > v.startAt, {
    message: "종료는 시작보다 이후여야 합니다.",
    path: ["endAt"],
  });

export type EventFormValues = z.infer<typeof eventSchema>;
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm test src/components/events/schemas.test.ts` → PASS(4).

- [ ] **Step 5: 커밋**

```bash
git add src/components/events/schemas.ts src/components/events/schemas.test.ts
git commit -m "feat : 일정 폼 zod 스키마(종료>시작 검증) #37"
```

---

## Task 5: EventFormDialog (팝업 폼)

**Files:**
- Create: `src/components/events/EventFormDialog.tsx`
- Test: `src/components/events/EventFormDialog.test.tsx`

의존: `@/components/ui/dialog`(`Dialog`·`DialogContent`·`DialogHeader`·`DialogTitle`·`DialogFooter`), `DateTimePicker`(Task 2), `@/components/admin/MarkdownEditor`·`TagMultiSelect`(02), `@/components/ui/Input`·`Checkbox`·`Button`, `createEvent`/`updateEvent`(Task 3), `toServerDateTime`/`toLocalInput`(Task 1), `adminOnError`·`notify`. allDay는 `watch`로 DateTimePicker에 전달.

- [ ] **Step 1: 실패 테스트 작성**

```tsx
// src/components/events/EventFormDialog.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { createEventMock, updateEventMock, refreshMock, notifySuccess } = vi.hoisted(() => ({
  createEventMock: vi.fn(),
  updateEventMock: vi.fn(),
  refreshMock: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/events.admin", () => ({ createEvent: createEventMock, updateEvent: updateEventMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock, push: vi.fn() }) }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/lib/api/tags", () => ({ getTags: vi.fn().mockResolvedValue([]) }));

import { EventFormDialog } from "./EventFormDialog";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
function renderDialog(ui: React.ReactNode) {
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("EventFormDialog", () => {
  it("필수 누락 시 검증 메시지를 보이고 제출하지 않는다", async () => {
    renderDialog(<EventFormDialog open mode="create" onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("제목을 입력해 주세요.")).toBeDefined());
    expect(createEventMock).not.toHaveBeenCalled();
  });

  it("등록 성공 시 startAt을 직렬화해 전송하고 새로고침·토스트·닫기", async () => {
    createEventMock.mockResolvedValue({ id: 7 });
    const onOpenChange = vi.fn();
    renderDialog(<EventFormDialog open mode="create" onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "수련회" } });
    fireEvent.change(screen.getByLabelText("시작"), { target: { value: "2026-06-14T10:00" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(createEventMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "수련회", startAt: "2026-06-14T10:00:00" }),
      ),
    );
    expect(refreshMock).toHaveBeenCalled();
    expect(notifySuccess).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("수정 모드는 initial.version을 PUT body에 포함한다", async () => {
    updateEventMock.mockResolvedValue({ id: 7 });
    const initial = {
      id: 7, title: "원본", description: null, location: null,
      startAt: "2026-06-14T10:00:00", endAt: null, allDay: false,
      createdAt: "2026-06-14T00:00:00", updatedAt: "2026-06-14T00:00:00", version: 3, tags: [],
    };
    renderDialog(<EventFormDialog open mode="edit" initial={initial} onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(updateEventMock).toHaveBeenCalledWith(7, expect.objectContaining({ version: 3 })),
    );
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/components/events/EventFormDialog.test.tsx` → FAIL.

- [ ] **Step 3: 구현**

```tsx
// src/components/events/EventFormDialog.tsx
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { DateTimePicker } from "@/components/admin/DateTimePicker";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { TagMultiSelect } from "@/components/admin/TagMultiSelect";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { toServerDateTime, toLocalInput } from "@/lib/date";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import {
  createEvent,
  updateEvent,
  type EventCreateRequest,
  type EventUpdateRequest,
} from "@/lib/api/events.admin";
import type { EventDetailResponse } from "@/lib/api/types";
import { eventSchema, type EventFormValues } from "./schemas";

export interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: EventDetailResponse;
}

const SAVED_NOTICE = "저장했습니다. 공개 페이지 반영은 최대 1분 걸릴 수 있습니다.";

function toBody(v: EventFormValues): EventCreateRequest {
  const opt = (s: string) => (s.trim() === "" ? undefined : s);
  return {
    title: v.title,
    startAt: toServerDateTime(v.startAt, v.allDay),
    endAt: v.endAt === "" ? undefined : toServerDateTime(v.endAt, v.allDay),
    allDay: v.allDay,
    location: opt(v.location),
    description: opt(v.description),
    tagIds: v.tagIds,
  };
}

export function EventFormDialog({ open, onOpenChange, mode, initial }: EventFormDialogProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: initial?.title ?? "",
      startAt: toLocalInput(initial?.startAt ?? "", initial?.allDay ?? false),
      endAt: toLocalInput(initial?.endAt ?? "", initial?.allDay ?? false),
      allDay: initial?.allDay ?? false,
      location: initial?.location ?? "",
      description: initial?.description ?? "",
      tagIds: initial?.tags.map((t) => t.id) ?? [],
    },
  });
  const allDay = watch("allDay");

  const mutation = useMutation({
    mutationFn: (v: EventFormValues) => {
      const body = toBody(v);
      if (mode === "edit" && initial) {
        const put: EventUpdateRequest = { ...body, version: initial.version };
        return updateEvent(initial.id, put);
      }
      return createEvent(body);
    },
    onError: adminOnError({
      onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof EventFormValues, { message: fe.reason })),
      onReedit: () => router.refresh(),
    }),
    onSuccess: () => {
      notify.success(SAVED_NOTICE);
      router.refresh();
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "일정 수정" : "새 일정"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-base">
          <Field id="event-title" label="제목">
            <Input id="event-title" error={errors.title?.message} {...register("title")} />
          </Field>
          <Controller
            control={control}
            name="allDay"
            render={({ field }) => (
              <Checkbox label="종일" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
            )}
          />
          <Field id="event-startAt" label="시작">
            <Controller
              control={control}
              name="startAt"
              render={({ field }) => (
                <DateTimePicker id="event-startAt" value={field.value} onChange={field.onChange} allDay={allDay} error={errors.startAt?.message} />
              )}
            />
          </Field>
          <Field id="event-endAt" label="종료(선택)">
            <Controller
              control={control}
              name="endAt"
              render={({ field }) => (
                <DateTimePicker id="event-endAt" value={field.value} onChange={field.onChange} allDay={allDay} error={errors.endAt?.message} />
              )}
            />
          </Field>
          <Field id="event-location" label="장소(선택)">
            <Input id="event-location" {...register("location")} />
          </Field>
          <div className="flex flex-col gap-xs">
            <span className={cn(typo.bodySm, "text-ink")}>본문(선택)</span>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <MarkdownEditor value={field.value} onChange={field.onChange} id="event-description" />
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
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" variant="primary" loading={mutation.isPending}>저장</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={id} className={cn(typo.bodySm, "text-ink")}>{label}</label>
      {children}
    </div>
  );
}
```

> `DialogContent`의 정확한 서브컴포넌트(`DialogHeader`/`DialogTitle`/`DialogFooter`) export는 `src/components/ui/dialog.tsx`에서 확인됨. `getByLabelText("시작")`이 동작하려면 `<label htmlFor="event-startAt">` + `DateTimePicker`가 `id`를 `Input`에 전달해야 한다(Task 2가 id 전달).

- [ ] **Step 4: 통과 확인** — Run: `pnpm test src/components/events/EventFormDialog.test.tsx` → PASS(3).

- [ ] **Step 5: 커밋**

```bash
git add src/components/events/EventFormDialog.tsx src/components/events/EventFormDialog.test.tsx
git commit -m "feat : EventFormDialog 팝업 폼(종일·종료검증·낙관락·지연안내) #37"
```

---

## Task 6: EventAdminActions (목록·상세 액션 island)

**Files:**
- Create: `src/components/events/EventAdminActions.tsx`
- Test: `src/components/events/EventAdminActions.test.tsx`

두 export: `EventListAction`(toolbar "새 일정" → 생성 Dialog) / `EventDetailActions({event})`(수정 → 편집 Dialog 프리필 / 삭제 → `DeleteConfirmDialog` → `deleteEvent`).

- [ ] **Step 1: 실패 테스트 작성**

```tsx
// src/components/events/EventAdminActions.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { useMeMock, deleteEventMock, refreshMock, pushMock } = vi.hoisted(() => ({
  useMeMock: vi.fn(),
  deleteEventMock: vi.fn(),
  refreshMock: vi.fn(),
  pushMock: vi.fn(),
}));
vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock }));
vi.mock("@/lib/api/events.admin", () => ({ deleteEvent: deleteEventMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock, push: pushMock }) }));
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/tags", () => ({ getTags: vi.fn().mockResolvedValue([]) }));

import { EventListAction, EventDetailActions } from "./EventAdminActions";

const event = {
  id: 7, title: "수련회", description: null, location: null,
  startAt: "2026-06-14T10:00:00", endAt: null, allDay: false,
  createdAt: "2026-06-14T00:00:00", updatedAt: "2026-06-14T00:00:00", version: 1, tags: [],
};
let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useMeMock.mockReturnValue({ data: { permissions: ["EVENT_WRITE"] }, isLoading: false });
});
afterEach(() => vi.clearAllMocks());
function renderWithQc(ui: React.ReactNode) {
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("EventListAction", () => {
  it("EVENT_WRITE 보유 시 '새 일정' 버튼을 노출한다", () => {
    renderWithQc(<EventListAction />);
    expect(screen.getByRole("button", { name: "새 일정" })).toBeDefined();
  });
  it("권한 미보유 시 렌더하지 않는다", () => {
    useMeMock.mockReturnValue({ data: { permissions: [] }, isLoading: false });
    renderWithQc(<EventListAction />);
    expect(screen.queryByRole("button", { name: "새 일정" })).toBeNull();
  });
});

describe("EventDetailActions", () => {
  it("삭제 확정 시 deleteEvent를 호출한다", async () => {
    deleteEventMock.mockResolvedValue(undefined);
    renderWithQc(<EventDetailActions event={event} />);
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    // 트리거·확정 둘 다 '삭제'라 다이얼로그 스코프에서 확정 버튼을 집는다(Radix Dialog role="dialog")
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(deleteEventMock).toHaveBeenCalledWith(7));
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/components/events/EventAdminActions.test.tsx` → FAIL.

- [ ] **Step 3: 구현**

```tsx
// src/components/events/EventAdminActions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Button } from "@/components/ui/Button";
import { EventFormDialog } from "./EventFormDialog";
import { deleteEvent } from "@/lib/api/events.admin";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import type { EventDetailResponse } from "@/lib/api/types";

export function EventListAction() {
  const [open, setOpen] = useState(false);
  return (
    <RequirePermission permission="EVENT_WRITE">
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>새 일정</Button>
      <EventFormDialog open={open} onOpenChange={setOpen} mode="create" />
    </RequirePermission>
  );
}

export function EventDetailActions({ event }: { event: EventDetailResponse }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const remove = useMutation({
    mutationFn: () => deleteEvent(event.id),
    onError: adminOnError(),
    onSuccess: () => {
      notify.success("삭제했습니다. 공개 페이지 반영은 최대 1분 걸릴 수 있습니다.");
      setDelOpen(false);
      router.refresh();
    },
  });
  return (
    <RequirePermission permission="EVENT_WRITE">
      <div className="flex gap-sm">
        <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>수정</Button>
        <Button type="button" variant="secondary" onClick={() => setDelOpen(true)}>삭제</Button>
      </div>
      <EventFormDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" initial={event} />
      <DeleteConfirmDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title="일정을 삭제할까요?"
        warning="삭제하면 공개 캘린더에서 사라집니다."
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </RequirePermission>
  );
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm test src/components/events/EventAdminActions.test.tsx` → PASS(3).

- [ ] **Step 5: 커밋**

```bash
git add src/components/events/EventAdminActions.tsx src/components/events/EventAdminActions.test.tsx
git commit -m "feat : 일정 인라인 액션(toolbar 등록·상세 수정/삭제) #37"
```

---

## Task 7: 공개 캘린더·상세·모달에 액션 주입

**Files:**
- Modify: `src/app/(site)/events/page.tsx`(목록 toolbar), `src/app/(site)/events/[id]/page.tsx`(딥링크 상세), `src/components/events/EventDetailModal.tsx`(캘린더 모달)

먼저 각 파일을 열어 정확한 구조 확인 후 최소 주입. EventDetailModal/Detail은 `EventDetailResponse`(version 포함)를 보유한 지점에 `EventDetailActions`를 꽂는다.

- [ ] **Step 1: events/page.tsx 목록 toolbar 주입**

상단에 `import { EventListAction } from "@/components/events/EventAdminActions";` 추가 후, `<h1 …>일정</h1>`을 flex 래퍼로 감싸 우측에 액션:

```tsx
// 변경 전: <h1 className={cn(typo.displayMd, "text-ink")}>일정</h1>
// 변경 후:
<div className="flex items-center justify-between gap-base">
  <h1 className={cn(typo.displayMd, "text-ink")}>일정</h1>
  <EventListAction />
</div>
```

- [ ] **Step 2: events/[id]/page.tsx 딥링크 상세 액션 주입**

`import { EventDetailActions } from "@/components/events/EventAdminActions";` 추가 후, `EventDetailView` 근처(제목 영역)에 `<EventDetailActions event={event} />` 삽입(RSC가 받은 `event: EventDetailResponse`를 그대로 전달).

- [ ] **Step 3: EventDetailModal.tsx 모달 액션 주입**

`import { EventDetailActions } from "@/components/events/EventAdminActions";` 추가. 모달의 `const shown = … ? detail : null;` 삼항 **truthy 가지 안**에 둔다(타입 안전 — `shown`이 `EventDetailResponse`로 좁혀진 가지). 기존 `{shown ? <EventDetailView event={shown} /> : <Skeleton/>}`를 Fragment로 감싼다:

```tsx
{shown ? (
  <>
    <EventDetailView event={shown} />
    <EventDetailActions event={shown} />
  </>
) : (
  /* 기존 falsy 가지(Skeleton 등) 그대로 */
)}
```

- [ ] **Step 4: 기존 테스트 회귀 방지 — island null-스텁 추가**

island은 `RequirePermission`→`useMe`(useQuery)→QueryClient 의존이라, 주입 시 기존 페이지/모달 테스트가 'No QueryClient' throw로 깨진다. 각 기존 테스트 파일의 대상 컴포넌트 import **위**에 null-스텁을 추가한다(02 sermons 선례 그대로):

- `src/app/(site)/events/page.test.tsx`: `vi.mock("@/components/events/EventAdminActions", () => ({ EventListAction: () => null }));`
- `src/app/(site)/events/[id]/page.test.tsx`: `vi.mock("@/components/events/EventAdminActions", () => ({ EventDetailActions: () => null }));`
- `src/components/events/EventDetailModal.test.tsx`: `vi.mock("@/components/events/EventAdminActions", () => ({ EventDetailActions: () => null }));`

Run: `npx tsc --noEmit` → 0. `pnpm test src/components/events "src/app/(site)/events"` → 기존 테스트(스텁 적용) + 신규 액션 테스트 전부 PASS.

- [ ] **Step 5: 커밋**

```bash
git add "src/app/(site)/events/page.tsx" "src/app/(site)/events/[id]/page.tsx" src/components/events/EventDetailModal.tsx \
        "src/app/(site)/events/page.test.tsx" "src/app/(site)/events/[id]/page.test.tsx" src/components/events/EventDetailModal.test.tsx
git commit -m "feat : 공개 캘린더·상세·모달에 일정 액션 주입(+테스트 스텁) #37"
```

---

## Task 8: DESIGN.md 등록 + 전체 검증

**Files:**
- Modify: `.claude/rules/DESIGN.md`(`admin:03` 마커 아래만)

- [ ] **Step 1: DESIGN.md admin:03 구획에 2항목 append**

`<!-- admin:03 일정 — datetime-picker · event-form-modal -->` 바로 아래에(다른 구획 라인 불가침):

```markdown
- **`datetime-picker`**: 일정 시작·종료 입력. 네이티브 `<input type="datetime-local">`(종일이면 `date`) 래퍼, 라이브러리 없이. `Input` 토큰·error 배선 상속. 직렬화는 `toServerDateTime`(offset 없는 LocalDateTime).
- **`event-form-modal`**: 일정 등록·수정 팝업 Dialog 폼. DateTimePicker·MarkdownEditor·TagMultiSelect·Checkbox(종일) 조합. 종료>시작 검증, 낙관락 version.
```

- [ ] **Step 2: 전체 테스트** — Run: `pnpm test` → 02 기준 554 + 03 신규 전부 PASS.

- [ ] **Step 3: 타입·린트·빌드** — Run: `npx tsc --noEmit`(0) · `pnpm lint`(0) · `pnpm build`(성공).

- [ ] **Step 4: 완료 기준 점검(설계 §11)** — DateTimePicker·toServerDateTime/toLocalInput·events.admin·EventFormDialog·인라인 액션·DESIGN 2항목, hex/px 0·typo·이모지 0·삼항.

- [ ] **Step 5: 커밋**

```bash
git add .claude/rules/DESIGN.md
git commit -m "docs : DESIGN.md 어드민 03 컴포넌트 2종 등록 #37"
```

---

## 자기 검토 메모(작성자)

- **스펙 커버리지**: 설계 §3 모듈 전부 매핑(date util=T1, DateTimePicker=T2, events.admin=T3, schema=T4, EventFormDialog=T5, EventAdminActions=T6, 주입=T7, DESIGN+검증=T8). `endAfterStart`·`patchEvent` 제외(의도).
- **타입 일관성**: `EventCreateRequest`/`EventUpdateRequest`(T3) → T5 폼 사용. `DateTimePickerProps`(value/onChange/allDay/id/error, T2) → T5 Controller. `EventDetailActions({event: EventDetailResponse})`(T6) → T7 주입. `toServerDateTime`/`toLocalInput`(T1) → T5.
- **검증 필요(구현 시 실측)**: `events/page.tsx`·`[id]/page.tsx`·`EventDetailModal.tsx`의 정확한 주입 위치(파일 열어 확인), `dialog.tsx`의 서브컴포넌트 export 이름, `EVENT_WRITE`·manageDomains events 항목.
