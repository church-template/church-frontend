import { describe, it, expect, vi, afterEach } from "vitest";
import { getTags } from "./tags";

afterEach(() => vi.unstubAllGlobals());

describe("getTags", () => {
  it("'/api/tags'를 revalidate 300으로 호출하고 평배열 반환", async () => {
    const tags = [{ id: 1, name: "주일설교" }];
    const spy = vi.fn(async () => ({ ok: true, json: async () => tags }) as Response);
    vi.stubGlobal("fetch", spy);
    expect(await getTags()).toEqual(tags);
    expect(spy).toHaveBeenCalledWith("/api/tags", { next: { revalidate: 300 } });
  });
  it("비 200이면 throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    await expect(getTags()).rejects.toThrow("GET /api/tags 실패: 500");
  });
});
