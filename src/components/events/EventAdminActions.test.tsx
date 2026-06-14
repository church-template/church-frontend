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
