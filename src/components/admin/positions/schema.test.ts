import { describe, it, expect } from "vitest";
import { positionSchema } from "./schema";

describe("positionSchema", () => {
  it("name + sortOrder 숫자는 통과", () => {
    expect(positionSchema.safeParse({ name: "목사", sortOrder: 10 }).success).toBe(true);
  });
  it("sortOrder null 허용(비움)", () => {
    expect(positionSchema.safeParse({ name: "목사", sortOrder: null }).success).toBe(true);
  });
  it("빈 이름 실패", () => {
    expect(positionSchema.safeParse({ name: "", sortOrder: null }).success).toBe(false);
  });
  it("sortOrder 음수·소수 실패", () => {
    expect(positionSchema.safeParse({ name: "목사", sortOrder: -1 }).success).toBe(false);
    expect(positionSchema.safeParse({ name: "목사", sortOrder: 1.5 }).success).toBe(false);
  });
});
