import { describe, it, expect, vi, afterEach } from "vitest";

const { apiMutateMock } = vi.hoisted(() => ({ apiMutateMock: vi.fn() }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { createNotice, updateNotice, patchNotice, deleteNotice } from "./notices.admin";

afterEach(() => vi.clearAllMocks());

describe("공지 어드민 API", () => {
  it("createNotice은 POST /api/admin/notices로 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 3 });
    await createNotice({ title: "공지", isPinned: false });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/notices", {
      method: "POST",
      body: { title: "공지", isPinned: false },
    });
  });

  it("updateNotice은 PUT /{id}로 title+version을 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 3 });
    await updateNotice(3, { title: "공지", isPinned: true, version: 2 });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/notices/3", {
      method: "PUT",
      body: { title: "공지", isPinned: true, version: 2 },
    });
  });

  it("patchNotice은 PATCH /{id}로 isPinned 토글을 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 3 });
    await patchNotice(3, { version: 2, isPinned: true });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/notices/3", {
      method: "PATCH",
      body: { version: 2, isPinned: true },
    });
  });

  it("deleteNotice은 DELETE /{id}", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteNotice(3);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/notices/3", { method: "DELETE" });
  });
});
