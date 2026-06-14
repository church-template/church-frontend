import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

const { fetchAlbumsMock, fetchAlbumMock, getTagsMock } = vi.hoisted(() => ({
  fetchAlbumsMock: vi.fn(),
  fetchAlbumMock: vi.fn(),
  getTagsMock: vi.fn(),
}));
vi.mock("@/lib/api/gallery", () => ({ fetchAlbums: fetchAlbumsMock, fetchAlbum: fetchAlbumMock }));
vi.mock("@/lib/api/tags", () => ({ getTags: getTagsMock }));

import { useAlbums, useAlbum, useGalleryTags } from "./queries";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  fetchAlbumsMock.mockReset();
  fetchAlbumMock.mockReset();
  getTagsMock.mockReset();
});

describe("useAlbums", () => {
  it("fetchAlbums 결과를 반환하고 params를 전달한다", async () => {
    fetchAlbumsMock.mockResolvedValue({ content: [{ id: 1 }], page: { size: 12, number: 0, totalElements: 1, totalPages: 1 } });
    const { result } = renderHook(() => useAlbums({ page: 0, tagId: 2 }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchAlbumsMock).toHaveBeenCalledWith({ page: 0, tagId: 2 });
    expect(result.current.data?.content[0].id).toBe(1);
  });
});

describe("useAlbum", () => {
  it("fetchAlbum(id) 결과를 반환한다", async () => {
    fetchAlbumMock.mockResolvedValue({ id: 9, title: "Z", tags: [], photos: [], createdAt: "x", updatedAt: "x", version: 0 });
    const { result } = renderHook(() => useAlbum(9), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchAlbumMock).toHaveBeenCalledWith(9);
    expect(result.current.data?.id).toBe(9);
  });
});

describe("useGalleryTags", () => {
  it("getTags(공개 fetch) 결과를 반환한다", async () => {
    getTagsMock.mockResolvedValue([{ id: 1, name: "수련회" }]);
    const { result } = renderHook(() => useGalleryTags(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe("수련회");
  });
});
