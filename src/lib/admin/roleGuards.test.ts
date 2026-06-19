import { describe, it, expect } from "vitest";
import { canManageRole } from "./roleGuards";
import type { RoleResponse } from "@/lib/api/roles.admin";

const role = (over: Partial<RoleResponse>): RoleResponse => ({ id: 1, name: "R", priority: 10, isSystem: false, description: "", permissions: [], ...over });

describe("canManageRole", () => {
  it("시스템 역할은 false", () => { expect(canManageRole(role({ isSystem: true, priority: 5 }), 100)).toBe(false); });
  it("내 등급 초과는 false", () => { expect(canManageRole(role({ priority: 60 }), 50)).toBe(false); });
  it("같은 등급은 true(같은 레벨 허용)", () => { expect(canManageRole(role({ priority: 50 }), 50)).toBe(true); });
  it("낮은 등급은 true", () => { expect(canManageRole(role({ priority: 10 }), 50)).toBe(true); });
});
