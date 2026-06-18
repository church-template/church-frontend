import { describe, it, expect, vi, afterEach } from "vitest";

const { apiMutateMock } = vi.hoisted(() => ({ apiMutateMock: vi.fn() }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { createTag, patchTag, deleteTag } from "./tags.admin";

afterEach(() => vi.clearAllMocks());

describe("태그 어드민 API", () => {
  it("createTag은 POST로 name을 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 1, name: "주일설교" });
    await createTag({ name: "주일설교" });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/tags", { method: "POST", body: { name: "주일설교" } });
  });
  it("patchTag은 PATCH로 name을 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 1, name: "수정" });
    await patchTag(1, { name: "수정" });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/tags/1", { method: "PATCH", body: { name: "수정" } });
  });
  it("deleteTag은 DELETE를 호출한다", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteTag(1);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/tags/1", { method: "DELETE" });
  });
});
