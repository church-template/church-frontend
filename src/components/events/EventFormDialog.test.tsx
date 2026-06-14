// src/components/events/EventFormDialog.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { createEventMock, updateEventMock, refreshMock, notifySuccess, revalidateEventsMock } = vi.hoisted(() => ({
  createEventMock: vi.fn(),
  updateEventMock: vi.fn(),
  refreshMock: vi.fn(),
  notifySuccess: vi.fn(),
  revalidateEventsMock: vi.fn(),
}));
vi.mock("@/lib/api/events.admin", () => ({ createEvent: createEventMock, updateEvent: updateEventMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock, push: vi.fn() }) }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/lib/api/tags", () => ({ getTags: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateEvents: revalidateEventsMock }));

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
    await waitFor(() => expect(revalidateEventsMock).toHaveBeenCalled());
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
