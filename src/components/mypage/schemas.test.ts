import { describe, it, expect } from "vitest";
import { profileSchema, passwordChangeSchema } from "./schemas";

describe("profileSchema", () => {
  it("유효 입력 통과", () => {
    expect(profileSchema.safeParse({ name: "홍길동", phone: "010-1234-5678", email: "" }).success).toBe(true);
  });
  it("빈 이름 거부", () => {
    expect(profileSchema.safeParse({ name: "", phone: "010-1234-5678", email: "" }).success).toBe(false);
  });
  it("잘못된 이메일 거부", () => {
    expect(profileSchema.safeParse({ name: "홍", phone: "010-1234-5678", email: "bad" }).success).toBe(false);
  });
});

describe("passwordChangeSchema", () => {
  it("일치하는 8자+ 통과", () => {
    expect(passwordChangeSchema.safeParse({ password: "abcd1234", passwordConfirm: "abcd1234" }).success).toBe(true);
  });
  it("불일치 거부", () => {
    expect(passwordChangeSchema.safeParse({ password: "abcd1234", passwordConfirm: "x" }).success).toBe(false);
  });
  it("8자 미만 거부", () => {
    expect(passwordChangeSchema.safeParse({ password: "a1", passwordConfirm: "a1" }).success).toBe(false);
  });
});
