# 등록·수정 폼 페이지 통일 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 일정·갤러리·주보의 등록/수정 다이얼로그를 공지·설교와 동일한 전용 페이지 폼으로 전환해 UI를 통일하고, 폼-in-모달 계열 문제(레이어·모바일 공간)를 제거한다.

**Architecture:** 다이얼로그 폼 3개를 페이지 폼 컴포넌트로 전환(검증·낙관락·revalidate 로직 그대로 이식)하고 라우트 6개를 신설한다. 진입 버튼은 `<Link className={buttonVariants(...)}>` 링크로 교체. 삭제 확인 등 소형 다이얼로그는 유지하되 공용 `DialogContent`에 모바일 좌우 여백을 보정한다.

**Tech Stack:** Next.js(App Router, RSC+client island)·TypeScript·RHF+zod·TanStack Query·Tailwind v4 토큰

**Spec:** `docs/superpowers/specs/2026-07-19-form-page-unification-design.md`

## Global Constraints

- 답변·주석 한국어(WHY 중심 최소), hex·px 인라인 금지(토큰 유틸), 텍스트는 `typo.*`, 아이콘 lucide만, JSX 조건부는 삼항
- **신규 테스트 작성 금지(사용자 지시)** — 기존 테스트는 스위트 그린 유지 목적의 최소 수정·대체·삭제만 한다
- **파일 삭제 6개는 스펙 승인으로 합의됨**: `EventFormDialog.tsx`(+test) · `BulletinFormDialog.tsx`(+test) · `AlbumFormDialog.tsx`(+test)
- 검증 기준: `pnpm test`(기존 실패 4파일 5건 — 소개·히어로·사진, 무관 — 외 신규 실패 0), `npx tsc --noEmit` 에러 0, `pnpm lint` 에러 0(기존 경고 3건 허용)
- 커밋은 사용자 명시 요청 시에만(마지막 게이트), Co-Authored-By 금지, 메시지 끝 이슈 태그 필수
- 페이지 셸 선례: `src/app/(site)/notices/new/page.tsx`·`notices/[id]/edit/page.tsx` (sr-only h1 + `RequirePermission fallback={<EditAccessDenied />}`)

---

### Task 1: 일정(Event) 페이지 폼 전환

**Files:**
- Create: `src/components/events/EventForm.tsx`
- Create: `src/app/(site)/events/new/page.tsx`
- Create: `src/app/(site)/events/[id]/edit/page.tsx`
- Modify: `src/components/events/EventAdminActions.tsx` (전체 교체)
- Modify: `src/components/events/EventAdminActions.test.tsx` (전체 교체 — 기존 케이스 최소 대체)
- Delete: `src/components/events/EventFormDialog.tsx`, `src/components/events/EventFormDialog.test.tsx`

**Interfaces:**
- Consumes: `eventSchema`/`EventFormValues`(`./schemas`), `createEvent`/`updateEvent`(`@/lib/api/events.admin`), `getEvent`(`@/lib/api/events`, `Promise<EventDetailResponse | null>`), `revalidateEvents`, `buttonVariants`(`@/components/ui/Button`), `ACTION`/`CREATE_ICON`(`@/constants/actionButton`)
- Produces: `EventForm({ mode: "create" | "edit"; initial?: EventDetailResponse })`, 라우트 `/events/new`·`/events/[id]/edit`

- [ ] **Step 1: `EventForm.tsx` 생성** — EventFormDialog에서 Dialog 래퍼만 벗긴 이식. mutationFn이 저장된 일정 id를 반환하게 해 create/edit 공통으로 상세 페이지로 push한다.

```tsx
// src/components/events/EventForm.tsx
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ACTION } from "@/constants/actionButton";
import { Checkbox } from "@/components/ui/Checkbox";
import { DateTimePicker } from "@/components/admin/DateTimePicker";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { TagMultiSelect } from "@/components/admin/TagMultiSelect";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { revalidateEvents } from "@/lib/admin/revalidate";
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

export interface EventFormProps {
  mode: "create" | "edit";
  initial?: EventDetailResponse;
}

const SAVED_NOTICE = "저장했습니다.";

// 폼 값 → 서버 요청 body 변환. offset 없는 LocalDateTime 직렬화는 toServerDateTime이 담당.
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

// 일정 등록·수정 페이지 폼 — 공지(NoticeForm)와 동형. 다이얼로그였던 시절의 open/onSaved는 페이지 전환으로 불필요.
export function EventForm({ mode, initial }: EventFormProps) {
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
  // allDay 상태를 실시간으로 DateTimePicker에 전달 — watch가 리렌더를 유발한다.
  const allDay = watch("allDay");

  const mutation = useMutation({
    // 저장된 일정 id 반환 — create/edit 공통으로 상세 페이지 이동에 쓴다.
    mutationFn: async (v: EventFormValues) => {
      const body = toBody(v);
      if (mode === "edit" && initial) {
        // 낙관락: 서버가 응답한 version을 그대로 PUT body에 실어 충돌을 감지한다(가이드 8장).
        const put: EventUpdateRequest = { ...body, version: initial.version };
        await updateEvent(initial.id, put);
        return initial.id;
      }
      const res = await createEvent(body);
      return res.id;
    },
    onError: adminOnError({
      onFieldErrors: (fes) =>
        fes.forEach((fe) => setError(fe.field as keyof EventFormValues, { message: fe.reason })),
      onReedit: () => router.refresh(),
    }),
    onSuccess: async (id) => {
      // updateTag 서버 액션으로 events 태그 ISR 캐시를 즉시 무효화한 뒤 알림·상세 이동.
      await revalidateEvents();
      notify.success(SAVED_NOTICE);
      router.push(`/events/${id}`);
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-lg">
      <Field id="event-title" label="제목">
        <Input id="event-title" error={errors.title?.message} {...register("title")} />
      </Field>
      <Controller
        control={control}
        name="allDay"
        render={({ field }) => (
          <Checkbox
            label="종일"
            checked={field.value}
            onChange={(e) => field.onChange(e.target.checked)}
          />
        )}
      />
      <Field id="event-startAt" label="시작">
        <Controller
          control={control}
          name="startAt"
          render={({ field }) => (
            <DateTimePicker
              id="event-startAt"
              value={field.value}
              onChange={field.onChange}
              allDay={allDay}
              error={errors.startAt?.message}
            />
          )}
        />
      </Field>
      <Field id="event-endAt" label="종료(선택)">
        <Controller
          control={control}
          name="endAt"
          render={({ field }) => (
            <DateTimePicker
              id="event-endAt"
              value={field.value}
              onChange={field.onChange}
              allDay={allDay}
              error={errors.endAt?.message}
            />
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
            <MarkdownEditor
              value={field.value}
              onChange={field.onChange}
              id="event-description"
              rows={5}
            />
          )}
        />
      </div>
      <div className="flex flex-col gap-xs">
        <span className={cn(typo.bodySm, "text-ink")}>태그(선택)</span>
        <Controller
          control={control}
          name="tagIds"
          render={({ field }) => (
            <TagMultiSelect value={field.value} onChange={field.onChange} />
          )}
        />
      </div>
      <div className="flex gap-sm">
        <Button type="button" variant="tertiary" onClick={() => router.back()}>
          {ACTION.cancel.label}
        </Button>
        <Button type="submit" variant="primary" loading={mutation.isPending}>
          {ACTION.save.label}
        </Button>
      </div>
    </form>
  );
}

// 폼 필드 레이블 + 콘텐츠를 묶는 래퍼. label htmlFor가 DateTimePicker·Input에 연결된다.
function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={id} className={cn(typo.bodySm, "text-ink")}>
        {label}
      </label>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: 라우트 페이지 2개 생성** (공지 선례 복제)

```tsx
// src/app/(site)/events/new/page.tsx
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { EventForm } from "@/components/events/EventForm";

export default function EventNewPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">일정 등록</h1>
      <RequirePermission permission="EVENT_WRITE" fallback={<EditAccessDenied />}>
        <EventForm mode="create" />
      </RequirePermission>
    </Container>
  );
}
```

```tsx
// src/app/(site)/events/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { EventForm } from "@/components/events/EventForm";
import { getEvent } from "@/lib/api/events";

export default async function EventEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 비숫자·0·음수 id는 fetch 전에 차단 — 형제 라우트([id]/page.tsx)와 동일 패턴
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const event = await getEvent(numId);
  if (!event) notFound();
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">일정 수정</h1>
      <RequirePermission permission="EVENT_WRITE" fallback={<EditAccessDenied />}>
        <EventForm mode="edit" initial={event} />
      </RequirePermission>
    </Container>
  );
}
```

- [ ] **Step 3: `EventAdminActions.tsx` 전체 교체** — 등록·수정을 링크로, 삭제 다이얼로그는 유지.

```tsx
// src/components/events/EventAdminActions.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Button, buttonVariants } from "@/components/ui/Button";
import { ACTION, CREATE_ICON } from "@/constants/actionButton";
import { deleteEvent } from "@/lib/api/events.admin";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { revalidateEvents } from "@/lib/admin/revalidate";
import type { EventDetailResponse } from "@/lib/api/types";

// ISR 공개 페이지 위 client island — 일정 목록 toolbar의 "새 일정" 진입 링크.
// RequirePermission이 EVENT_WRITE 미보유 시 null 반환(UX 게이트).
export function EventListAction() {
  return (
    <RequirePermission permission="EVENT_WRITE">
      <Link href="/events/new" className={buttonVariants("primary")}>
        <CREATE_ICON size={18} aria-hidden />
        새 일정
      </Link>
    </RequirePermission>
  );
}

// 일정 상세(캘린더 모달·딥링크 페이지) 위 수정/삭제 액션 island.
// 수정은 전용 페이지(/events/[id]/edit) 링크 — 라우트 전환으로 부모 모달이 자연 해소된다.
// onClose: 삭제 성공 후 호출하는 콜백 — 캘린더 모달 닫기 등 부모 정리에 쓴다.
export function EventDetailActions({ event, onClose }: { event: EventDetailResponse; onClose?: () => void }) {
  const router = useRouter();
  const [delOpen, setDelOpen] = useState(false);

  const remove = useMutation({
    mutationFn: () => deleteEvent(event.id),
    onError: adminOnError(),
    onSuccess: async () => {
      // updateTag 서버 액션으로 events 캐시 즉시 무효화 후 모달 닫기·부모 콜백·새로고침.
      await revalidateEvents();
      notify.success("삭제했습니다.");
      setDelOpen(false);
      onClose?.();
      router.refresh();
    },
  });

  return (
    <RequirePermission permission="EVENT_WRITE">
      <div className="flex gap-sm">
        <Link href={`/events/${event.id}/edit`} aria-label="일정 수정" className={buttonVariants("tertiary")}>
          <ACTION.edit.Icon size={18} aria-hidden />
          <span className="hidden lg:inline">{ACTION.edit.label}</span>
        </Link>
        <Button type="button" variant="tertiary" aria-label="일정 삭제" onClick={() => setDelOpen(true)}>
          <ACTION.delete.Icon size={18} aria-hidden />
          <span className="hidden lg:inline">{ACTION.delete.label}</span>
        </Button>
      </div>
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

- [ ] **Step 4: `EventAdminActions.test.tsx` 전체 교체** — 신규 작성 아님: 버튼→링크 역할 변경 반영 + 다이얼로그 제출 케이스를 링크 진입 확인으로 1:1 대체.

```tsx
// src/components/events/EventAdminActions.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { useMeMock, deleteEventMock, refreshMock, pushMock, revalidateEventsMock } = vi.hoisted(() => ({
  useMeMock: vi.fn(),
  deleteEventMock: vi.fn(),
  refreshMock: vi.fn(),
  pushMock: vi.fn(),
  revalidateEventsMock: vi.fn(),
}));
vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock }));
vi.mock("@/lib/api/events.admin", () => ({ deleteEvent: deleteEventMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock, push: pushMock }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateEvents: revalidateEventsMock }));

import { EventListAction, EventDetailActions } from "./EventAdminActions";

const onCloseMock = vi.fn();

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
  it("EVENT_WRITE 보유 시 '새 일정' 등록 페이지 링크를 노출한다", () => {
    renderWithQc(<EventListAction />);
    expect(screen.getByRole("link", { name: "새 일정" }).getAttribute("href")).toBe("/events/new");
  });
  it("권한 미보유 시 렌더하지 않는다", () => {
    useMeMock.mockReturnValue({ data: { permissions: [] }, isLoading: false });
    renderWithQc(<EventListAction />);
    expect(screen.queryByRole("link", { name: "새 일정" })).toBeNull();
  });
});

describe("EventDetailActions", () => {
  it("삭제 확정 시 deleteEvent를 호출하고 revalidate 및 onClose 콜백을 실행한다", async () => {
    deleteEventMock.mockResolvedValue(undefined);
    renderWithQc(<EventDetailActions event={event} onClose={onCloseMock} />);
    // 행 트리거는 aria-label="일정 삭제"로 찾고, 확정 버튼은 다이얼로그 스코프 내 "삭제"로 찾는다.
    fireEvent.click(screen.getByRole("button", { name: "일정 삭제" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(deleteEventMock).toHaveBeenCalledWith(7));
    await waitFor(() => expect(revalidateEventsMock).toHaveBeenCalled());
    expect(onCloseMock).toHaveBeenCalled();
  });

  it("수정은 전용 수정 페이지 링크다(다이얼로그 아님)", () => {
    renderWithQc(<EventDetailActions event={event} onClose={onCloseMock} />);
    expect(screen.getByRole("link", { name: "일정 수정" }).getAttribute("href")).toBe("/events/7/edit");
  });
});
```

- [ ] **Step 5: 다이얼로그 파일 삭제** (Global Constraints의 합의된 목록)

```bash
rm src/components/events/EventFormDialog.tsx src/components/events/EventFormDialog.test.tsx
```

- [ ] **Step 6: 검증**

Run: `pnpm test events 2>&1 | tail -5 && npx tsc --noEmit && pnpm lint`
Expected: events 테스트 전부 통과(EventFormDialog.test 삭제로 파일 수 감소), tsc 에러 0, lint 에러 0

### Task 2: 주보(Bulletin) 페이지 폼 전환

**Files:**
- Create: `src/components/bulletins/BulletinForm.tsx`
- Create: `src/app/(site)/bulletins/new/page.tsx`
- Create: `src/app/(site)/bulletins/[id]/edit/page.tsx`
- Modify: `src/components/bulletins/BulletinAdminActions.tsx` (전체 교체)
- Modify: `src/components/bulletins/BulletinAdminActions.test.tsx` (전체 교체 — 기존 케이스 최소 대체)
- Delete: `src/components/bulletins/BulletinFormDialog.tsx`, `src/components/bulletins/BulletinFormDialog.test.tsx`

**Interfaces:**
- Consumes: `bulletinSchema`/`BulletinFormValues`(`./schemas`), `createBulletin`/`patchBulletin`(`@/lib/api/bulletins.admin`), `getBulletin`(`@/lib/api/bulletins`, **미존재 시 throw** — 페이지에서 `.catch(() => null)`로 404 수렴), `revalidateBulletins`, `MediaPicker`
- Produces: `BulletinForm({ mode; initial?: BulletinDetailResponse })` — RSC 시드로 다이얼로그 시절의 useEffect 시드·`seeding` 상태·`bulletinId` prop이 삭제됨. 라우트 `/bulletins/new`·`/bulletins/[id]/edit`

- [ ] **Step 1: `BulletinForm.tsx` 생성**

```tsx
// src/components/bulletins/BulletinForm.tsx
"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ACTION } from "@/constants/actionButton";
import { DateTimePicker } from "@/components/admin/DateTimePicker";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { revalidateBulletins } from "@/lib/admin/revalidate";
import { createBulletin, patchBulletin } from "@/lib/api/bulletins.admin";
import type { BulletinDetailResponse } from "@/lib/api/types";
import { bulletinSchema, type BulletinFormValues } from "./schemas";

export interface BulletinFormProps {
  mode: "create" | "edit";
  // edit 시 RSC(getBulletin no-store)가 최신 값·version까지 내려준다 — 클라 시드 불필요.
  initial?: BulletinDetailResponse;
}

// 주보 등록·수정 페이지 폼 — 공지(NoticeForm)와 동형. PDF 선택은 MediaPicker(Dialog) 재사용.
export function BulletinForm({ mode, initial }: BulletinFormProps) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const { register, handleSubmit, setValue, watch, setError, formState: { errors } } = useForm<BulletinFormValues>({
    resolver: zodResolver(bulletinSchema),
    defaultValues: {
      title: initial?.title ?? "",
      serviceDate: initial?.serviceDate ?? "",
      mediaId: initial?.mediaId ?? 0,
    },
  });
  const serviceDate = watch("serviceDate");
  const mediaId = watch("mediaId");

  const mutation = useMutation({
    mutationFn: (v: BulletinFormValues) =>
      mode === "edit" && initial
        ? patchBulletin(initial.id, { version: initial.version, title: v.title, serviceDate: v.serviceDate, mediaId: v.mediaId })
        : createBulletin({ title: v.title, serviceDate: v.serviceDate, mediaId: v.mediaId }),
    onError: adminOnError({
      onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof BulletinFormValues, { message: fe.reason })),
      // 409 재편집: RSC가 initial을 다시 내려주도록 새로고침(다이얼로그 시절의 수동 재시드 대체, NoticeForm 동형).
      onReedit: () => router.refresh(),
    }),
    onSuccess: async () => {
      await revalidateBulletins();
      notify.success("저장했습니다.");
      // 주보는 상세 페이지가 없다(행=PDF 새 탭) — 목록으로 복귀.
      router.push("/bulletins");
    },
  });

  return (
    <>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-lg">
        <div className="flex flex-col gap-xxs">
          <label htmlFor="bulletin-title" className={cn(typo.bodySm, "text-body")}>제목</label>
          <Input id="bulletin-title" error={errors.title?.message} {...register("title")} />
        </div>
        <div className="flex flex-col gap-xxs">
          <label htmlFor="bulletin-date" className={cn(typo.bodySm, "text-body")}>예배일</label>
          <DateTimePicker
            id="bulletin-date"
            allDay
            value={serviceDate}
            onChange={(v) => setValue("serviceDate", v, { shouldValidate: true })}
            error={errors.serviceDate?.message}
          />
        </div>
        <div className="flex flex-col gap-xxs">
          <span className={cn(typo.bodySm, "text-body")}>PDF</span>
          <div className="flex items-center gap-sm">
            <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>PDF 선택</Button>
            {mediaId > 0 ? <span className={cn(typo.bodySm, "text-muted")}>선택됨 (media:{mediaId})</span> : null}
          </div>
          {errors.mediaId ? <span className={cn(typo.caption, "text-error")}>{errors.mediaId.message}</span> : null}
        </div>
        <div className="flex gap-sm">
          <Button type="button" variant="tertiary" onClick={() => router.back()}>{ACTION.cancel.label}</Button>
          <Button type="submit" variant="primary" loading={mutation.isPending}>{ACTION.save.label}</Button>
        </div>
      </form>
      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        accept="pdf"
        onConfirm={(ids) => setValue("mediaId", ids[0] ?? 0, { shouldValidate: true })}
      />
    </>
  );
}
```

- [ ] **Step 2: 라우트 페이지 2개 생성**

```tsx
// src/app/(site)/bulletins/new/page.tsx
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { BulletinForm } from "@/components/bulletins/BulletinForm";

export default function BulletinNewPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">주보 등록</h1>
      <RequirePermission permission="BULLETIN_WRITE" fallback={<EditAccessDenied />}>
        <BulletinForm mode="create" />
      </RequirePermission>
    </Container>
  );
}
```

```tsx
// src/app/(site)/bulletins/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { BulletinForm } from "@/components/bulletins/BulletinForm";
import { getBulletin } from "@/lib/api/bulletins";

export default async function BulletinEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 비숫자·0·음수 id는 fetch 전에 차단 — 공지 edit 라우트와 동일 패턴
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  // getBulletin은 미존재 시 throw — 페이지에선 404로 수렴시킨다(공개 셸에서 스택 노출 방지).
  const bulletin = await getBulletin(numId).catch(() => null);
  if (!bulletin) notFound();
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">주보 수정</h1>
      <RequirePermission permission="BULLETIN_WRITE" fallback={<EditAccessDenied />}>
        <BulletinForm mode="edit" initial={bulletin} />
      </RequirePermission>
    </Container>
  );
}
```

- [ ] **Step 3: `BulletinAdminActions.tsx` 전체 교체**

```tsx
// src/components/bulletins/BulletinAdminActions.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/Button";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { revalidateBulletins } from "@/lib/admin/revalidate";
import { deleteBulletin } from "@/lib/api/bulletins.admin";
import type { BulletinCardResponse } from "@/lib/api/types";
import { ACTION, CREATE_ICON } from "@/constants/actionButton";

// 목록 toolbar 등록 진입 링크(전용 페이지).
export function BulletinListAction() {
  return (
    <RequirePermission permission="BULLETIN_WRITE">
      <Link href="/bulletins/new" className={buttonVariants("primary")}>
        <CREATE_ICON size={18} aria-hidden />
        새 주보
      </Link>
    </RequirePermission>
  );
}

// 행 액션(앵커 밖 형제). 수정=전용 페이지 링크, 삭제=확인 다이얼로그.
export function BulletinRowActions({ b }: { b: BulletinCardResponse }) {
  const router = useRouter();
  const [delOpen, setDelOpen] = useState(false);
  const remove = useMutation({
    mutationFn: () => deleteBulletin(b.id),
    onError: adminOnError(),
    onSuccess: async () => {
      await revalidateBulletins();
      notify.success("삭제했습니다.");
      setDelOpen(false);
      router.refresh();
    },
  });
  return (
    <RequirePermission permission="BULLETIN_WRITE">
      <div className="flex shrink-0 gap-xs">
        <Link href={`/bulletins/${b.id}/edit`} aria-label="주보 수정" className={buttonVariants("tertiary")}>
          <ACTION.edit.Icon size={18} aria-hidden />
          <span className="hidden lg:inline">{ACTION.edit.label}</span>
        </Link>
        <Button type="button" variant="tertiary" aria-label="주보 삭제" onClick={() => setDelOpen(true)}>
          <ACTION.delete.Icon size={18} aria-hidden />
          <span className="hidden lg:inline">{ACTION.delete.label}</span>
        </Button>
      </div>
      <DeleteConfirmDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title="주보를 삭제할까요?"
        warning="삭제하면 공개 목록에서 사라집니다.(PDF 원본은 라이브러리에 보존)"
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </RequirePermission>
  );
}
```

- [ ] **Step 4: `BulletinAdminActions.test.tsx` 전체 교체** — FormDialog mock 제거(모듈 삭제됨), 수정 트리거 케이스를 링크 확인으로 대체.

```tsx
// src/components/bulletins/BulletinAdminActions.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { deleteMock, refreshMock, notifySuccess, revalidateMock } = vi.hoisted(() => ({
  deleteMock: vi.fn(), refreshMock: vi.fn(), notifySuccess: vi.fn(), revalidateMock: vi.fn(),
}));
vi.mock("@/lib/api/bulletins.admin", () => ({ deleteBulletin: deleteMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock, push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateBulletins: revalidateMock }));
// 권한 게이트는 통과로 고정(useMe 미목 시 children 미렌더 방지)
vi.mock("@/components/admin/RequirePermission", () => ({ RequirePermission: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { BulletinRowActions } from "./BulletinAdminActions";

afterEach(() => vi.clearAllMocks());
const renderQc = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

describe("BulletinRowActions", () => {
  it("삭제 확인 시 deleteBulletin 호출·revalidate", async () => {
    deleteMock.mockResolvedValue(undefined);
    renderQc(<BulletinRowActions b={{ id: 7, title: "주보", serviceDate: "2026-06-07", mediaId: 1, createdAt: "2026-06-07T00:00:00" }} />);
    fireEvent.click(screen.getByRole("button", { name: "주보 삭제" })); // 트리거(aria-label)
    fireEvent.click(screen.getByRole("button", { name: "삭제" })); // 확인 다이얼로그의 확정(기본 라벨)
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(7));
    await waitFor(() => expect(revalidateMock).toHaveBeenCalled());
  });

  it("수정은 전용 수정 페이지 링크다(다이얼로그 아님)", () => {
    renderQc(<BulletinRowActions b={{ id: 7, title: "주보", serviceDate: "2026-06-07", mediaId: 1, createdAt: "2026-06-07T00:00:00" }} />);
    expect(screen.getByRole("link", { name: "주보 수정" }).getAttribute("href")).toBe("/bulletins/7/edit");
  });
});
```

- [ ] **Step 5: 다이얼로그 파일 삭제**

```bash
rm src/components/bulletins/BulletinFormDialog.tsx src/components/bulletins/BulletinFormDialog.test.tsx
```

- [ ] **Step 6: 검증**

Run: `pnpm test bulletins 2>&1 | tail -5 && npx tsc --noEmit && pnpm lint`
Expected: bulletins 테스트 전부 통과, tsc 에러 0, lint 에러 0

### Task 3: 갤러리(Album) 페이지 폼 전환

**Files:**
- Create: `src/components/gallery/AlbumForm.tsx`
- Create: `src/components/gallery/AlbumEditLoader.tsx`
- Create: `src/app/(site)/gallery/albums/new/page.tsx`
- Create: `src/app/(site)/gallery/albums/[id]/edit/page.tsx`
- Modify: `src/components/gallery/GalleryAdminActions.tsx` (전체 교체)
- Modify: `src/components/gallery/GalleryAdminActions.test.tsx` (mock 라인 정리 + next/link mock)
- Delete: `src/components/gallery/AlbumFormDialog.tsx`, `src/components/gallery/AlbumFormDialog.test.tsx`

**Interfaces:**
- Consumes: `albumSchema`/`AlbumFormValues`(`./schemas`), `createAlbum`(→`GalleryAlbumDetailResponse`)/`patchAlbum`(`@/lib/api/gallery.admin`), `useAlbum(id)`(`./queries` — 기존 훅, `["album", id]` 키), `GalleryGate`
- Produces: `AlbumForm({ mode; initial?: GalleryAlbumDetailResponse })`, `AlbumEditLoader({ id: number })` — 클라 시드 후 keyed 마운트로 폼 defaultValues 고정. 라우트 `/gallery/albums/new`·`/gallery/albums/[id]/edit`

- [ ] **Step 1: `AlbumForm.tsx` 생성** — 갤러리는 회원 전용(authFetch)이라 ISR revalidate 없음, 클라 쿼리 캐시만 무효화(기존과 동일).

```tsx
// src/components/gallery/AlbumForm.tsx
"use client";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { TagMultiSelect } from "@/components/admin/TagMultiSelect";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { createAlbum, patchAlbum } from "@/lib/api/gallery.admin";
import type { GalleryAlbumDetailResponse } from "@/lib/api/types";
import { ACTION } from "@/constants/actionButton";
import { albumSchema, type AlbumFormValues } from "./schemas";

export interface AlbumFormProps {
  mode: "create" | "edit";
  initial?: GalleryAlbumDetailResponse;
}

// 앨범 등록·수정 페이지 폼 — 공지(NoticeForm)와 동형. edit는 AlbumEditLoader가 keyed 마운트로 시드.
export function AlbumForm({ mode, initial }: AlbumFormProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const { register, handleSubmit, control, setError, formState: { errors } } = useForm<AlbumFormValues>({
    resolver: zodResolver(albumSchema),
    defaultValues: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      tagIds: initial?.tags.map((t) => t.id) ?? [],
    },
  });

  const mutation = useMutation({
    // 저장된 앨범 id 반환 — create/edit 공통으로 상세 페이지 이동에 쓴다.
    mutationFn: async (v: AlbumFormValues) => {
      const body = { title: v.title, description: v.description.trim() === "" ? undefined : v.description, tagIds: v.tagIds };
      if (mode === "edit" && initial) {
        await patchAlbum(initial.id, { ...body, version: initial.version });
        return initial.id;
      }
      const res = await createAlbum(body);
      return res.id;
    },
    onError: adminOnError({
      onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof AlbumFormValues, { message: fe.reason })),
      // 409 재편집: 앨범 쿼리 무효화 → AlbumEditLoader가 최신 version으로 폼을 다시 마운트한다(keyed).
      onReedit: () => qc.invalidateQueries({ queryKey: initial ? ["album", initial.id] : ["albums"] }),
    }),
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["albums"] });
      if (mode === "edit" && initial) qc.invalidateQueries({ queryKey: ["album", initial.id] });
      notify.success("저장했습니다.");
      router.push(`/gallery/albums/${id}`);
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-lg">
      <div className="flex flex-col gap-xxs">
        <label htmlFor="album-title" className={cn(typo.bodySm, "text-body")}>제목</label>
        <Input id="album-title" error={errors.title?.message} {...register("title")} />
      </div>
      <div className="flex flex-col gap-xxs">
        <label htmlFor="album-desc" className={cn(typo.bodySm, "text-body")}>설명</label>
        <Controller
          control={control}
          name="description"
          render={({ field }) => <MarkdownEditor id="album-desc" value={field.value} onChange={field.onChange} error={errors.description?.message} />}
        />
      </div>
      <Controller control={control} name="tagIds" render={({ field }) => <TagMultiSelect value={field.value} onChange={field.onChange} />} />
      <div className="flex gap-sm">
        <Button type="button" variant="tertiary" onClick={() => router.back()}>{ACTION.cancel.label}</Button>
        <Button type="submit" variant="primary" loading={mutation.isPending}>{ACTION.save.label}</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: `AlbumEditLoader.tsx` 생성**

```tsx
// src/components/gallery/AlbumEditLoader.tsx
"use client";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { useAlbum } from "./queries";
import { AlbumForm } from "./AlbumForm";

// edit 시드 — 회원 전용(authFetch, 토큰은 클라에만)이라 RSC fetch 불가, 클라 쿼리로 최신 version을 시드.
// keyed 마운트로 defaultValues를 고정한다(effect reset 금지 — set-state-in-effect lint 관례).
export function AlbumEditLoader({ id }: { id: number }) {
  const album = useAlbum(id);
  if (album.isPending) {
    return <p className={cn(typo.bodySm, "text-muted")}>불러오는 중…</p>;
  }
  if (album.isError || !album.data) {
    return <p className={cn(typo.bodySm, "text-error")}>앨범을 불러오지 못했습니다.</p>;
  }
  return <AlbumForm key={album.data.id} mode="edit" initial={album.data} />;
}
```

- [ ] **Step 3: 라우트 페이지 2개 생성** — 갤러리 페이지 셸(GalleryGate) + 권한 게이트 조합.

```tsx
// src/app/(site)/gallery/albums/new/page.tsx
import type { Metadata } from "next";
import { Container } from "@/components/shell/Container";
import { GalleryGate } from "@/components/gallery/GalleryGate";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { AlbumForm } from "@/components/gallery/AlbumForm";

export const metadata: Metadata = { title: "갤러리" };

export default function AlbumNewPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">앨범 등록</h1>
      <GalleryGate>
        <RequirePermission permission="GALLERY_WRITE" fallback={<EditAccessDenied />}>
          <AlbumForm mode="create" />
        </RequirePermission>
      </GalleryGate>
    </Container>
  );
}
```

```tsx
// src/app/(site)/gallery/albums/[id]/edit/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/shell/Container";
import { GalleryGate } from "@/components/gallery/GalleryGate";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { AlbumEditLoader } from "@/components/gallery/AlbumEditLoader";

export const metadata: Metadata = { title: "갤러리" };

export default async function AlbumEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 비숫자·0·음수 id는 렌더 전에 차단 — 앨범 상세 라우트와 동일 패턴
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">앨범 수정</h1>
      <GalleryGate>
        <RequirePermission permission="GALLERY_WRITE" fallback={<EditAccessDenied />}>
          <AlbumEditLoader id={numId} />
        </RequirePermission>
      </GalleryGate>
    </Container>
  );
}
```

- [ ] **Step 4: `GalleryAdminActions.tsx` 전체 교체**

```tsx
// src/components/gallery/GalleryAdminActions.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/Button";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { deleteAlbum } from "@/lib/api/gallery.admin";
import type { GalleryAlbumDetailResponse } from "@/lib/api/types";
import { ACTION, CREATE_ICON } from "@/constants/actionButton";

// 목록 toolbar 등록 진입 링크(전용 페이지).
export function AlbumListAction() {
  return (
    <RequirePermission permission="GALLERY_WRITE">
      <Link href="/gallery/albums/new" className={buttonVariants("primary")}>
        <CREATE_ICON size={18} aria-hidden />
        새 앨범
      </Link>
    </RequirePermission>
  );
}

// 상세 수정/삭제. 수정=전용 페이지 링크, 삭제 성공 시 목록으로 이동 + 캐시 무효화.
export function AlbumDetailActions({ album }: { album: GalleryAlbumDetailResponse }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [delOpen, setDelOpen] = useState(false);
  const remove = useMutation({
    mutationFn: () => deleteAlbum(album.id),
    onError: adminOnError(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["albums"] });
      notify.success("삭제했습니다.");
      setDelOpen(false);
      router.push("/gallery");
    },
  });
  return (
    <RequirePermission permission="GALLERY_WRITE">
      <div className="mt-base flex gap-xs">
        <Link href={`/gallery/albums/${album.id}/edit`} aria-label="앨범 수정" className={buttonVariants("tertiary")}>
          <ACTION.edit.Icon size={18} aria-hidden />
          <span className="hidden lg:inline">{ACTION.edit.label}</span>
        </Link>
        <Button type="button" variant="tertiary" aria-label="앨범 삭제" onClick={() => setDelOpen(true)}>
          <ACTION.delete.Icon size={18} aria-hidden />
          <span className="hidden lg:inline">{ACTION.delete.label}</span>
        </Button>
      </div>
      <DeleteConfirmDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title="앨범을 삭제할까요?"
        warning="앨범이 공개 목록에서 사라집니다.(사진 원본은 라이브러리에 보존)"
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </RequirePermission>
  );
}
```

- [ ] **Step 5: `GalleryAdminActions.test.tsx` 최소 수정** — 삭제된 모듈 mock 제거 + next/link mock 추가(그 외 케이스 무변경).

기존 파일에서 다음 라인을 **삭제**:

```tsx
vi.mock("./AlbumFormDialog", () => ({ AlbumFormDialog: () => null }));
```

그 자리에 다음 mock을 **추가**(import 블록에 `import type { ReactNode } from "react";` 포함):

```tsx
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
```

- [ ] **Step 6: 다이얼로그 파일 삭제**

```bash
rm src/components/gallery/AlbumFormDialog.tsx src/components/gallery/AlbumFormDialog.test.tsx
```

- [ ] **Step 7: 검증**

Run: `pnpm test gallery 2>&1 | tail -5 && npx tsc --noEmit && pnpm lint`
Expected: gallery 테스트 전부 통과(AlbumList.test·AlbumDetail.test의 GalleryAdminActions mock은 export 이름 불변이라 그대로 유효), tsc 에러 0, lint 에러 0

### Task 4: 다이얼로그 모바일 여백·문서 갱신·전체 검증·커밋 게이트

**Files:**
- Modify: `src/components/ui/dialog.tsx:46` (w-full 1개 치환)
- Modify: `.claude/rules/DESIGN.md` (어드민 공용 구획 4개 라인)

**Interfaces:**
- Consumes: Task 1~3 완료 상태
- Produces: 남는 모든 Dialog의 모바일 좌우 여백, 문서-구현 일치, 전체 검증 통과

- [ ] **Step 1: `DialogContent` 모바일 여백** — dialog.tsx의 content 클래스에서 `w-full`을 교체(폰에서 화면에 꽉 붙는 문제):

기존(46행):

```
"fixed left-1/2 top-1/2 z-overlay grid w-full max-w-[var(--container-modal)] -translate-x-1/2 -translate-y-1/2 gap-base max-h-[85vh] overflow-y-auto",
```

교체:

```
"fixed left-1/2 top-1/2 z-overlay grid w-[calc(100%-var(--spacing-base)*2)] max-w-[var(--container-modal)] -translate-x-1/2 -translate-y-1/2 gap-base max-h-[85vh] overflow-y-auto",
```

(calc는 스페이싱 토큰 참조 — vh 선례와 같은 레이아웃 값 예외. 데스크톱은 max-w가 지배해 변화 없음.)

- [ ] **Step 2: DESIGN.md 어드민 공용 구획 4개 라인 교체** — 각 라인을 grep으로 찾아 아래로 치환(다른 구획 라인 불가침):

`event-form-modal` 라인 →

```markdown
- **`event-form-page`**: 일정 등록·수정 전용 페이지(`/events/new`·`/events/[id]/edit`, 공지·설교 폼 페이지와 동형). DateTimePicker·MarkdownEditor·TagMultiSelect·Checkbox(종일) 조합. 종료>시작 검증, 낙관락 version. edit는 RSC `getEvent` 시드.
```

`bulletin-form-modal` 라인 →

```markdown
- **`bulletin-form-page`**: 주보 등록·수정 전용 페이지(`/bulletins/new`·`/bulletins/[id]/edit`). Input(제목)·DateTimePicker(예배일)·MediaPicker(pdf·single). edit는 RSC `getBulletin`(no-store) 시드 + 낙관락 version.
```

`album-form-modal` 라인 →

```markdown
- **`album-form-page`**: 갤러리 앨범 등록·수정 전용 페이지(`/gallery/albums/new`·`/gallery/albums/[id]/edit`, 회원 영역 GalleryGate). Input(제목)·MarkdownEditor(설명)·TagMultiSelect. edit는 클라 `useAlbum` 시드(keyed 마운트) + 낙관락 version.
```

`admin-inline-action` 라인 →

```markdown
- **`admin-inline-action`**: 공개 RSC 페이지 위 client island(목록 toolbar 등록 진입·상세 수정/삭제·공지 고정 토글). 등록·수정 진입은 전용 페이지 Link(`buttonVariants`), 삭제는 확인 Dialog. `RequirePermission` 게이트, 카드 내부 중첩 `<a>` 금지(목록 액션은 카드 밖).
```

- [ ] **Step 3: 전체 검증**

Run: `pnpm test 2>&1 | tail -4`
Expected: 실패는 기존 4파일 5건(SymbolismList·VisionHero·HeroHeaderSync·ChurchPhotosPage — 본 작업과 무관)만. 신규 실패 0

Run: `npx tsc --noEmit && pnpm lint`
Expected: tsc 에러 0, lint 에러 0(기존 경고 3건)

Run: `pnpm build 2>&1 | tail -15`
Expected: 빌드 성공 — 신규 라우트 6개가 라우트 목록에 등장(`[id]` 라우트는 동적, 기존 `/notices/new`와 동일 취급)

- [ ] **Step 4: 수동 확인 목록(사용자)** — `pnpm dev` 후:

1. 일정: "새 일정" → `/events/new` 페이지 폼, 저장 → 상세 이동 / 캘린더 상세 모달 "수정" → 수정 페이지
2. 주보: "새 주보" → 페이지 폼, PDF 선택(MediaPicker 다이얼로그) 정상, 저장 → 목록 복귀 / 행 "수정" → 수정 페이지(기존 값 프리필)
3. 갤러리: "새 앨범" → 페이지 폼 / 상세 "수정" → 수정 페이지(로딩 후 프리필)
4. 모바일 폭: 세 폼 모두 페이지라 잘림·가림 없음, 삭제 확인 다이얼로그가 좌우 16px 여백을 갖는지

- [ ] **Step 5: 커밋 — 사용자 승인 게이트**

커밋은 사용자 명시 요청 시에만. 기능별 커밋 관례(마이크로 커밋 금지)에 따라 **4커밋 분할을 제안**하고 이슈 번호를 확인한다:

```bash
# 1) 일정
git add src/components/events/ src/app/\(site\)/events/
git commit -m "refactor : 일정 등록·수정 다이얼로그를 전용 페이지로 전환 #<이슈번호>"
# 2) 주보
git add src/components/bulletins/ src/app/\(site\)/bulletins/
git commit -m "refactor : 주보 등록·수정 다이얼로그를 전용 페이지로 전환 #<이슈번호>"
# 3) 갤러리
git add src/components/gallery/ src/app/\(site\)/gallery/
git commit -m "refactor : 갤러리 앨범 등록·수정 다이얼로그를 전용 페이지로 전환 #<이슈번호>"
# 4) 공통(다이얼로그 여백·문서·스펙·플랜)
git add src/components/ui/dialog.tsx .claude/rules/DESIGN.md docs/superpowers/
git commit -m "fix : 다이얼로그 모바일 좌우 여백 보정 및 폼 페이지 통일 문서 갱신 #<이슈번호>"
```

삭제 파일(rm 6개)은 각 도메인 커밋에 포함된다(git add가 삭제도 스테이징). Co-Authored-By 금지, push는 별도 요청 시에만.
