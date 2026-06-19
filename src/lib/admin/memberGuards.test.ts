import { describe, it, expect } from "vitest";
import { canAssignRole } from "./memberGuards";
import type { RoleResponse } from "@/lib/api/roles.admin";

const role = (priority: number, isSystem = false): RoleResponse => ({ id: 1, name: "R", priority, isSystem, description: "", permissions: [] });

describe("canAssignRole(strict, 동급 차단)", () => {
  it("내 등급보다 낮으면 부여 가능", () => expect(canAssignRole(role(40), 50)).toBe(true));
  it("동급은 차단", () => expect(canAssignRole(role(50), 50)).toBe(false));
  it("상위는 차단", () => expect(canAssignRole(role(70), 50)).toBe(false));
  it("isSystem이어도 priority로만 판정(MEMBER 승인 허용)", () => expect(canAssignRole(role(10, true), 50)).toBe(true));
});
