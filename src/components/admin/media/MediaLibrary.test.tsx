// src/components/admin/media/MediaLibrary.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { listMediaMock, getRefsMock, deleteMediaMock, notifySuccess } = vi.hoisted(() => ({
  listMediaMock: vi.fn(),
  getRefsMock: vi.fn(),
  deleteMediaMock: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/media.admin", () => ({
  listMedia: listMediaMock,
  getMediaReferences: getRefsMock,
  deleteMedia: deleteMediaMock,
}));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/mypage/manage/media",
}));

import { MediaLibrary } from "./MediaLibrary";

afterEach(() => vi.clearAllMocks());
function renderQc(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}
const oneItem = {
  content: [{ id: 5, filename: "a.png", mimeType: "image/png", size: 2048, uploadedBy: 1, createdAt: "2026-06-15T00:00:00" }],
  page: { size: 20, number: 0, totalElements: 1, totalPages: 1 },
};

describe("MediaLibrary", () => {
  it("목록을 테이블로 보여준다", async () => {
    listMediaMock.mockResolvedValue(oneItem);
    renderQc(<MediaLibrary />);
    await waitFor(() => expect(screen.getByText("a.png")).toBeDefined());
  });

  it("이미지 행에 썸네일과 열기 링크를 보여준다", async () => {
    listMediaMock.mockResolvedValue(oneItem);
    const { container } = renderQc(<MediaLibrary />);
    const link = await screen.findByRole("link", { name: "열기" });
    expect(link.getAttribute("href")).toContain("/api/media/5");
    expect(container.querySelector("img")).not.toBeNull();
  });

  it("사용 중이면 references 다이얼로그를 띄우고 삭제하지 않는다", async () => {
    listMediaMock.mockResolvedValue(oneItem);
    getRefsMock.mockResolvedValue({ mediaId: 5, inUse: true, references: [{ type: "sermon", id: 1, title: "설교" }] });
    renderQc(<MediaLibrary />);
    await waitFor(() => expect(screen.getByText("a.png")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(screen.getByText("삭제할 수 없습니다")).toBeDefined());
    expect(deleteMediaMock).not.toHaveBeenCalled();
  });
});
