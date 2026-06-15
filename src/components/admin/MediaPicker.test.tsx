// src/components/admin/MediaPicker.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { listMediaMock } = vi.hoisted(() => ({ listMediaMock: vi.fn() }));
vi.mock("@/lib/api/media.admin", () => ({ listMedia: listMediaMock }));
// MediaUploader는 별도 테스트됨 — 여기선 무력화
vi.mock("./MediaUploader", () => ({ MediaUploader: () => null }));

import { MediaPicker } from "./MediaPicker";

afterEach(() => vi.clearAllMocks());
function renderQc(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("MediaPicker", () => {
  it("라이브러리 항목을 선택해 확정하면 onConfirm(mediaIds)을 호출한다", async () => {
    listMediaMock.mockResolvedValue({
      content: [{ id: 3, filename: "a.pdf", mimeType: "application/pdf", size: 1, uploadedBy: 1, createdAt: "2026-06-15T00:00:00" }],
      page: { size: 20, number: 0, totalElements: 1, totalPages: 1 },
    });
    const onConfirm = vi.fn();
    renderQc(<MediaPicker open accept="pdf" onOpenChange={() => {}} onConfirm={onConfirm} />);
    await waitFor(() => expect(screen.getByText("a.pdf")).toBeDefined());
    fireEvent.click(screen.getByText("a.pdf"));
    fireEvent.click(screen.getByRole("button", { name: /선택/ }));
    expect(onConfirm).toHaveBeenCalledWith([3]);
  });
});
