import { describe, it, expect, vi, afterEach } from "vitest";

const { apiMutateMock } = vi.hoisted(() => ({ apiMutateMock: vi.fn() }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { createPosition, patchPosition, deletePosition } from "./positions.admin";

afterEach(() => vi.clearAllMocks());

describe("직분 어드민 API", () => {
  it("createPosition은 POST로 sortOrder 포함 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 1 });
    await createPosition({ name: "목사", sortOrder: 10 });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/positions", { method: "POST", body: { name: "목사", sortOrder: 10 } });
  });
  it("createPosition은 sortOrder 없이도 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 1 });
    await createPosition({ name: "장로" });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/positions", { method: "POST", body: { name: "장로" } });
  });
  it("patchPosition은 PATCH로 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 1 });
    await patchPosition(1, { name: "권사", sortOrder: 20 });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/positions/1", { method: "PATCH", body: { name: "권사", sortOrder: 20 } });
  });
  it("deletePosition은 DELETE를 호출한다", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deletePosition(1);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/positions/1", { method: "DELETE" });
  });
});
