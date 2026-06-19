import { describe, it, expect } from "vitest";
import { createRoleSchema } from "./schema";

const s = createRoleSchema(50);

describe("createRoleSchema", () => {
  it("정상값 통과", () => { expect(s.safeParse({ name: "교사", priority: 30, description: "" }).success).toBe(true); });
  it("빈 이름 실패", () => { expect(s.safeParse({ name: "", priority: 30, description: "" }).success).toBe(false); });
  it("51자 이름 실패", () => { expect(s.safeParse({ name: "가".repeat(51), priority: 30, description: "" }).success).toBe(false); });
  it("priority 소수 실패", () => { expect(s.safeParse({ name: "교사", priority: 1.5, description: "" }).success).toBe(false); });
  it("priority가 maxPriority 초과면 실패", () => { expect(s.safeParse({ name: "교사", priority: 51, description: "" }).success).toBe(false); });
  it("priority == maxPriority 통과(같은 등급 허용)", () => { expect(s.safeParse({ name: "교사", priority: 50, description: "" }).success).toBe(true); });
  it("priority 음수 통과(하한 없음 — 계약 무제약)", () => { expect(s.safeParse({ name: "교사", priority: -1, description: "" }).success).toBe(true); });
  it("description 256자 실패", () => { expect(s.safeParse({ name: "교사", priority: 30, description: "가".repeat(256) }).success).toBe(false); });
});
