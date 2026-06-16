import { describe, it, expect } from "vitest";
import { departmentSchema } from "./schema";

const base = { name: "청년부", description: "", leader: "", parentId: null, sortOrder: null };

describe("departmentSchema", () => {
  it("name이 비면 실패한다", () => {
    const r = departmentSchema.safeParse({ ...base, name: "" });
    expect(r.success).toBe(false);
  });

  it("유효한 값은 통과한다", () => {
    const r = departmentSchema.safeParse({ name: "청년부", description: "설명", leader: "김집사", parentId: 1, sortOrder: 10 });
    expect(r.success).toBe(true);
  });

  it("parentId·sortOrder는 null을 허용한다", () => {
    expect(departmentSchema.safeParse(base).success).toBe(true);
  });

  it("name은 100자를 넘으면 실패한다", () => {
    const r = departmentSchema.safeParse({ ...base, name: "가".repeat(101) });
    expect(r.success).toBe(false);
  });

  it("sortOrder는 음수·소수면 실패한다", () => {
    expect(departmentSchema.safeParse({ ...base, sortOrder: -1 }).success).toBe(false);
    expect(departmentSchema.safeParse({ ...base, sortOrder: 1.5 }).success).toBe(false);
  });
});
