import { describe, it, expect } from "vitest";
import { tagSchema } from "./schema";

describe("tagSchema", () => {
  it("정상 이름은 통과", () => {
    expect(tagSchema.safeParse({ name: "주일설교" }).success).toBe(true);
  });
  it("빈/공백 이름은 실패", () => {
    expect(tagSchema.safeParse({ name: "" }).success).toBe(false);
    expect(tagSchema.safeParse({ name: "   " }).success).toBe(false);
  });
  it("51자 이상은 실패", () => {
    expect(tagSchema.safeParse({ name: "가".repeat(51) }).success).toBe(false);
  });
});
