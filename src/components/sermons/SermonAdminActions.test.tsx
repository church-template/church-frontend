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
vi.mock("@/lib/api/sermons.admin", () => ({ deleteSermon: deleteSermonMock }));
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
  it("삭제 확정 시 쿼리 무효화 후 목록으로 이동한다", async () => {
    useMeMock.mockReturnValue({ data: { permissions: ["SERMON_WRITE"] }, isLoading: false });
    deleteSermonMock.mockResolvedValue(undefined);
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    renderWithQc(<SermonDetailActions id={9} />);
    // 행 트리거는 aria-label="설교 삭제"로 찾고, 확정 다이얼로그 버튼은 라벨 "삭제"로 찾는다.
    fireEvent.click(screen.getByRole("button", { name: "설교 삭제" }));
    const confirmButtons = screen.getAllByRole("button", { name: "삭제" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    await waitFor(() => expect(deleteSermonMock).toHaveBeenCalledWith(9));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sermons"] }));
    expect(pushMock).toHaveBeenCalledWith("/sermons");
  });
});
