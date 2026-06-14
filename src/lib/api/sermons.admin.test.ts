import { describe, it, expect, vi, afterEach } from "vitest";

const { apiMutateMock } = vi.hoisted(() => ({ apiMutateMock: vi.fn() }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { createSermon, updateSermon, patchSermon, deleteSermon } from "./sermons";

afterEach(() => vi.clearAllMocks());

describe("설교 어드민 API", () => {
  it("createSermon은 POST /api/admin/sermons로 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 7 });
    await createSermon({ title: "t", preacher: "p", preachedAt: "2026-06-01" });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/sermons", {
      method: "POST",
      body: { title: "t", preacher: "p", preachedAt: "2026-06-01" },
    });
  });

  it("updateSermon은 PUT /{id}로 version 포함 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 7 });
    await updateSermon(7, { title: "t", preacher: "p", preachedAt: "2026-06-01", version: 3 });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/sermons/7", {
      method: "PUT",
      body: { title: "t", preacher: "p", preachedAt: "2026-06-01", version: 3 },
    });
  });

  it("patchSermon은 PATCH /{id}로 부분 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 7 });
    await patchSermon(7, { version: 3, title: "수정" });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/sermons/7", {
      method: "PATCH",
      body: { version: 3, title: "수정" },
    });
  });

  it("deleteSermon은 DELETE /{id}", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteSermon(7);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/sermons/7", { method: "DELETE" });
  });
});
