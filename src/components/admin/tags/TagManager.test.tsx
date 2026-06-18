import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getTagsMock, createMock, patchMock, deleteMock, notifySuccess, revalidateTagsMock } = vi.hoisted(() => ({
  getTagsMock: vi.fn(), createMock: vi.fn(), patchMock: vi.fn(), deleteMock: vi.fn(), notifySuccess: vi.fn(), revalidateTagsMock: vi.fn(),
}));
vi.mock("@/lib/api/tags", () => ({ getTags: getTagsMock }));
vi.mock("@/lib/api/tags.admin", () => ({ createTag: createMock, patchTag: patchMock, deleteTag: deleteMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateTags: revalidateTagsMock }));

import { TagManager } from "./TagManager";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); revalidateTagsMock.mockResolvedValue(undefined); });
afterEach(() => vi.clearAllMocks());
const renderManager = () => render(<QueryClientProvider client={qc}><TagManager /></QueryClientProvider>);

describe("TagManager", () => {
  it("태그 목록을 렌더", async () => {
    getTagsMock.mockResolvedValue([{ id: 1, name: "주일설교" }, { id: 2, name: "특별새벽" }]);
    renderManager();
    await waitFor(() => expect(screen.getByText("주일설교")).toBeDefined());
    expect(screen.getByText("특별새벽")).toBeDefined();
  });

  it("빈 목록 안내", async () => {
    getTagsMock.mockResolvedValue([]);
    renderManager();
    await waitFor(() => expect(screen.getByText("등록된 태그가 없습니다.")).toBeDefined());
  });

  it("새 태그 → 등록 다이얼로그에서 createTag", async () => {
    getTagsMock.mockResolvedValue([]);
    createMock.mockResolvedValue({ id: 9, name: "새태그" });
    renderManager();
    await waitFor(() => expect(screen.getByText("등록된 태그가 없습니다.")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "새 태그" }));
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "새태그" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createMock).toHaveBeenCalledWith({ name: "새태그" }));
    await waitFor(() => expect(revalidateTagsMock).toHaveBeenCalled());
  });

  it("삭제 확인 후 deleteTag·revalidateTags 호출", async () => {
    getTagsMock.mockResolvedValue([{ id: 1, name: "주일설교" }]);
    deleteMock.mockResolvedValue(undefined);
    renderManager();
    await waitFor(() => expect(screen.getByText("주일설교")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "주일설교 삭제" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "삭제" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(1));
    await waitFor(() => expect(revalidateTagsMock).toHaveBeenCalled());
  });
});
