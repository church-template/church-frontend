import { describe, it, expect } from "vitest";
import { noticeSchema } from "./schemas";

describe("noticeSchema", () => {
  it("title 누락 시 실패한다", () => {
    expect(noticeSchema.safeParse({ title: "", content: "", isPinned: false, tagIds: [] }).success).toBe(false);
  });
  it("title이 있으면 통과한다", () => {
    expect(
      noticeSchema.safeParse({ title: "안내", content: "", isPinned: false, tagIds: [] }).success,
    ).toBe(true);
  });
});
