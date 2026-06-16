// src/components/gallery/GalleryAdminActions.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { deleteMock, pushMock, notifySuccess } = vi.hoisted(() => ({ deleteMock: vi.fn(), pushMock: vi.fn(), notifySuccess: vi.fn() }));
vi.mock("@/lib/api/gallery.admin", () => ({ deleteAlbum: deleteMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, refresh: vi.fn() }) }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/components/admin/RequirePermission", () => ({ RequirePermission: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("./AlbumFormDialog", () => ({ AlbumFormDialog: () => null }));

import { AlbumDetailActions } from "./GalleryAdminActions";

afterEach(() => vi.clearAllMocks());
const album = { id: 7, title: "수련회", description: null, tags: [], author: null, createdAt: "2026-06-15T00:00:00", updatedAt: "2026-06-15T00:00:00", version: 2, photos: [] };
const renderQc = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

describe("AlbumDetailActions", () => {
  it("삭제 확인 시 deleteAlbum 호출·목록으로 이동", async () => {
    deleteMock.mockResolvedValue(undefined);
    renderQc(<AlbumDetailActions album={album} />);
    fireEvent.click(screen.getByRole("button", { name: "앨범 삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(7));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/gallery"));
  });
});
