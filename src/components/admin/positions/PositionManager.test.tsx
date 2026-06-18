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
