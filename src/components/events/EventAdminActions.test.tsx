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
