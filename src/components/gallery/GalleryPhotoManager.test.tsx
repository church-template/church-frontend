// src/components/gallery/GalleryPhotoManager.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { addPhotosMock, removePhotoMock, notifySuccess } = vi.hoisted(() => ({
  addPhotosMock: vi.fn(), removePhotoMock: vi.fn(), notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/gallery.admin", () => ({ addPhotos: addPhotosMock, removePhoto: removePhotoMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/components/admin/RequirePermission", () => ({ RequirePermission: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/admin/MediaPicker", () => ({
  MediaPicker: ({ open, onConfirm }: { open: boolean; onConfirm: (ids: number[]) => void }) =>
    open ? <button type="button" onClick={() => onConfirm([21])}>__pick</button> : null,
}));

import { AddPhotosButton, RemovePhotoButton } from "./GalleryPhotoManager";

afterEach(() => vi.clearAllMocks());
const renderQc = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

describe("GalleryPhotoManager", () => {
  it("사진 추가: MediaPicker 선택 → addPhotos(albumId, ids)", async () => {
    addPhotosMock.mockResolvedValue({ id: 9 });
    renderQc(<AddPhotosButton albumId={9} />);
    fireEvent.click(screen.getByRole("button", { name: "사진 추가" }));
    fireEvent.click(screen.getByRole("button", { name: "__pick" }));
    await waitFor(() => expect(addPhotosMock).toHaveBeenCalledWith(9, [21]));
  });

  it("사진 제거: 확인 시 removePhoto(photoId)", async () => {
    removePhotoMock.mockResolvedValue(undefined);
    renderQc(<RemovePhotoButton albumId={9} photoId={3} />);
    fireEvent.click(screen.getByRole("button", { name: "사진 제거" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제" })); // DeleteConfirmDialog 확정
    await waitFor(() => expect(removePhotoMock).toHaveBeenCalledWith(3));
  });
});
