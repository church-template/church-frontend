// src/components/bulletins/schemas.test.ts
import { describe, it, expect } from "vitest";
import { bulletinSchema } from "./schemas";

describe("bulletinSchema", () => {
  it("유효한 값을 통과시킨다", () => {
    const r = bulletinSchema.safeParse({ title: "주보", serviceDate: "2026-06-07", mediaId: 9 });
    expect(r.success).toBe(true);
  });
  it("mediaId가 0이면 실패한다(미선택)", () => {
    const r = bulletinSchema.safeParse({ title: "주보", serviceDate: "2026-06-07", mediaId: 0 });
    expect(r.success).toBe(false);
  });
  it("serviceDate 형식이 아니면 실패한다", () => {
    const r = bulletinSchema.safeParse({ title: "주보", serviceDate: "2026/06/07", mediaId: 9 });
    expect(r.success).toBe(false);
  });
});
