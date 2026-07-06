import { describe, it, expect, vi, beforeEach } from "vitest";

const apiMutateMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { createChallenge, patchChallenge, deleteChallenge } from "./challenges.admin";

beforeEach(() => apiMutateMock.mockReset());

describe("challenges.admin", () => {
  it("createChallenge: POST /api/admin/bible-challenges", async () => {
    apiMutateMock.mockResolvedValue({ id: 1 });
    const body = { title: "T", startBook: 40, endBook: 66, startDate: "2026-01-05", targetDays: 65 };
    await createChallenge(body);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/bible-challenges", { method: "POST", body });
  });
  it("patchChallenge: PATCH + version", async () => {
    apiMutateMock.mockResolvedValue({ id: 1 });
    await patchChallenge(1, { title: "T2", version: 3 });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/bible-challenges/1", {
      method: "PATCH", body: { title: "T2", version: 3 },
    });
  });
  it("deleteChallenge: DELETE", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteChallenge(1);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/bible-challenges/1", { method: "DELETE" });
  });
});
