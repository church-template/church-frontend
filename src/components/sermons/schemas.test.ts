import { describe, it, expect } from "vitest";
import { sermonSchema } from "./schemas";

describe("sermonSchema", () => {
  it("필수(title·preacher·preachedAt) 누락 시 실패한다", () => {
    const r = sermonSchema.safeParse({ title: "", preacher: "", preachedAt: "", content: "", tagIds: [] });
    expect(r.success).toBe(false);
  });
  it("필수가 채워지면 통과한다", () => {
    const r = sermonSchema.safeParse({
      title: "주일설교", preacher: "김목사", preachedAt: "2026-06-01",
      series: "", scripture: "", content: "", videoUrl: "", audioUrl: "", tagIds: [],
    });
    expect(r.success).toBe(true);
  });
});
