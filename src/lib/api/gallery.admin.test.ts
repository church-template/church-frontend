// src/lib/api/gallery.admin.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

const { apiMutateMock, apiUploadMock } = vi.hoisted(() => ({ apiMutateMock: vi.fn(), apiUploadMock: vi.fn() }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));
vi.mock("@/lib/admin/apiUpload", () => ({ apiUpload: apiUploadMock }));

import { createAlbum, patchAlbum, deleteAlbum, addPhotos, removePhoto } from "./gallery.admin";

afterEach(() => vi.clearAllMocks());

describe("gallery.admin", () => {
  it("createAlbum은 JSON body로 POST", async () => {
    apiMutateMock.mockResolvedValue({ id: 1 });
    await createAlbum({ title: "수련회", tagIds: [2] });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/gallery/albums", { method: "POST", body: { title: "수련회", tagIds: [2] } });
  });
  it("patchAlbum은 version을 body에 담아 PATCH", async () => {
    apiMutateMock.mockResolvedValue({ id: 1 });
    await patchAlbum(1, { title: "수정", version: 3 });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/gallery/albums/1", { method: "PATCH", body: { title: "수정", version: 3 } });
  });
  it("addPhotos는 mediaIds를 쿼리로 POST", async () => {
    apiUploadMock.mockResolvedValue({ id: 1 });
    await addPhotos(9, [3, 5]);
    expect(apiUploadMock).toHaveBeenCalledWith("/api/admin/gallery/albums/9/photos", { method: "POST", query: { mediaIds: [3, 5] } });
  });
  it("removePhoto는 apiMutate DELETE", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await removePhoto(11);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/gallery/photos/11", { method: "DELETE" });
  });
  it("deleteAlbum은 apiMutate DELETE", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteAlbum(7);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/gallery/albums/7", { method: "DELETE" });
  });
});
