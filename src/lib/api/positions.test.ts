import { describe, it, expect, vi, afterEach } from "vitest";
import { getPositions } from "./positions";

afterEach(() => vi.unstubAllGlobals());

describe("getPositions", () => {
  it("'/api/positions'를 호출하고 평배열 반환", async () => {
    const positions = [{ id: 1, name: "목사", sortOrder: 10, createdAt: "2026-06-17T00:00:00" }];
    const spy = vi.fn(async () => ({ ok: true, json: async () => positions }) as Response);
    vi.stubGlobal("fetch", spy);
    expect(await getPositions()).toEqual(positions);
    expect(spy).toHaveBeenCalledWith("/api/positions");
  });
  it("비 200이면 throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    await expect(getPositions()).rejects.toThrow("GET /api/positions 실패: 500");
  });
});
