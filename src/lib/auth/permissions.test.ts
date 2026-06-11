import { describe, it, expect } from "vitest";
import { hasPermission, hasAnyPermission } from "./permissions";
import type { MeResponse } from "./types";

const me: MeResponse = {
  uuid: "u1",
  name: "홍길동",
  phone: "01012345678",
  email: "",
  position: "성도",
  roles: ["MEMBER"],
  permissions: ["GALLERY_VIEW", "SERMON_WRITE"],
  maxPriority: 0,
  termsAgreed: true,
  privacyAgreed: true,
  agreedAt: "2026-01-01T00:00:00",
};

describe("hasPermission", () => {
  it("permissions에 있으면 true", () => {
    expect(hasPermission("GALLERY_VIEW", me)).toBe(true);
  });
  it("permissions에 없으면 false", () => {
    expect(hasPermission("NOTICE_WRITE", me)).toBe(false);
  });
  it("me가 undefined면 false(비로그인·로딩)", () => {
    expect(hasPermission("GALLERY_VIEW", undefined)).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  it("하나라도 있으면 true", () => {
    expect(hasAnyPermission(["NOTICE_WRITE", "SERMON_WRITE"], me)).toBe(true);
  });
  it("모두 없으면 false", () => {
    expect(hasAnyPermission(["NOTICE_WRITE", "EVENT_WRITE"], me)).toBe(false);
  });
});
