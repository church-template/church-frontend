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
vi.mock("@/lib/api/notices.admin", () => ({ patchNotice: patchNoticeMock, deleteNotice: deleteNoticeMock }));
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
