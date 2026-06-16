// src/components/gallery/AlbumFormDialog.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { createMock, patchMock, notifySuccess } = vi.hoisted(() => ({ createMock: vi.fn(), patchMock: vi.fn(), notifySuccess: vi.fn() }));
vi.mock("@/lib/api/gallery.admin", () => ({ createAlbum: createMock, patchAlbum: patchMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/lib/api/tags", () => ({ getTags: vi.fn().mockResolvedValue([]) }));

import { AlbumFormDialog } from "./AlbumFormDialog";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
const renderDialog = (ui: React.ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

describe("AlbumFormDialog", () => {
  it("등록: 제목 입력 후 저장하면 createAlbum 호출·invalidate", async () => {
    createMock.mockResolvedValue({ id: 1 });
    const onOpenChange = vi.fn();
    renderDialog(<AlbumFormDialog open mode="create" onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "수련회" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ title: "수련회" })));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("수정: initial.version을 PATCH body에 포함", async () => {
    patchMock.mockResolvedValue({ id: 1 });
    const initial = { id: 1, title: "원본", description: null, tags: [], author: null, createdAt: "2026-06-15T00:00:00", updatedAt: "2026-06-15T00:00:00", version: 5, photos: [] };
    renderDialog(<AlbumFormDialog open mode="edit" initial={initial} onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(patchMock).toHaveBeenCalledWith(1, expect.objectContaining({ version: 5 })));
  });
});
