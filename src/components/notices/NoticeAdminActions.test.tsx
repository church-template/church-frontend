// src/components/notices/NoticeAdminActions.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { useMeMock, patchNoticeMock, deleteNoticeMock, refreshMock, pushMock, revalidateNoticesMock, notifySuccessMock } = vi.hoisted(() => ({
  useMeMock: vi.fn(),
  patchNoticeMock: vi.fn(),
  deleteNoticeMock: vi.fn(),
  refreshMock: vi.fn(),
  pushMock: vi.fn(),
  revalidateNoticesMock: vi.fn(),
  notifySuccessMock: vi.fn(),
}));
vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock }));
vi.mock("@/lib/api/notices.admin", () => ({ patchNotice: patchNoticeMock, deleteNotice: deleteNoticeMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, refresh: refreshMock }) }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccessMock, error: vi.fn() } }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateNotices: revalidateNoticesMock }));

import { NoticeDetailActions } from "./NoticeAdminActions";

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useMeMock.mockReturnValue({ data: { permissions: ["NOTICE_WRITE"] }, isLoading: false });
  revalidateNoticesMock.mockResolvedValue(undefined);
});
afterEach(() => vi.clearAllMocks());
function renderWithQc(ui: React.ReactNode) {
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("NoticeDetailActions", () => {
  it("고정 토글을 누르면 patchNotice로 반대 isPinned+version을 보내고 캐시를 무효화한다", async () => {
    patchNoticeMock.mockResolvedValue({ id: 5 });
    renderWithQc(<NoticeDetailActions id={5} version={2} isPinned={false} />);
    fireEvent.click(screen.getByLabelText("상단 고정"));
    await waitFor(() =>
      expect(patchNoticeMock).toHaveBeenCalledWith(5, { version: 2, isPinned: true }),
    );
    await waitFor(() => expect(revalidateNoticesMock).toHaveBeenCalled());
    expect(refreshMock).toHaveBeenCalled();
  });

  it("삭제 확인 후 캐시 무효화·토스트·목록으로 이동한다", async () => {
    deleteNoticeMock.mockResolvedValue(undefined);
    renderWithQc(<NoticeDetailActions id={5} version={2} isPinned={false} />);
    // 행 트리거는 aria-label="공지 삭제"로 찾고, 확정 다이얼로그 버튼은 라벨 "삭제"로 찾는다.
    fireEvent.click(screen.getByRole("button", { name: "공지 삭제" }));
    const confirmButtons = screen.getAllByRole("button", { name: "삭제" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    await waitFor(() => expect(deleteNoticeMock).toHaveBeenCalledWith(5));
    await waitFor(() => expect(revalidateNoticesMock).toHaveBeenCalled());
    expect(notifySuccessMock).toHaveBeenCalledWith("삭제했습니다.");
    expect(pushMock).toHaveBeenCalledWith("/notices");
  });
});
