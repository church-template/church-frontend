// src/lib/api/bulletins.admin.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

const { apiUploadMock, apiMutateMock } = vi.hoisted(() => ({ apiUploadMock: vi.fn(), apiMutateMock: vi.fn() }));
vi.mock("@/lib/admin/apiUpload", () => ({ apiUpload: apiUploadMock }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { createBulletin, patchBulletin, deleteBulletin } from "./bulletins.admin";

afterEach(() => vi.clearAllMocks());

describe("bulletins.admin", () => {
  it("createBulletin은 title/serviceDate/mediaId를 쿼리로 POST한다", async () => {
    apiUploadMock.mockResolvedValue({ id: 1 });
    await createBulletin({ title: "6월 첫째주", serviceDate: "2026-06-07", mediaId: 9 });
    expect(apiUploadMock).toHaveBeenCalledWith("/api/admin/bulletins", {
      method: "POST",
      query: { title: "6월 첫째주", serviceDate: "2026-06-07", mediaId: 9 },
    });
  });

  it("patchBulletin은 version을 쿼리로 PATCH한다", async () => {
    apiUploadMock.mockResolvedValue({ id: 1 });
    await patchBulletin(1, { version: 3, title: "수정" });
    expect(apiUploadMock).toHaveBeenCalledWith("/api/admin/bulletins/1", {
      method: "PATCH",
      query: { version: 3, title: "수정", serviceDate: undefined, mediaId: undefined },
    });
  });

  it("deleteBulletin은 apiMutate DELETE", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteBulletin(2);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/bulletins/2", { method: "DELETE" });
  });
});
