import { describe, it, expect } from "vitest";
import { loginSchema, signupSchema, agreementsSchema } from "./schemas";

const validSignup = {
  name: "홍길동",
  phone: "010-1234-5678",
  password: "password1",
  passwordConfirm: "password1",
  email: "",
  termsAgreed: true,
  privacyAgreed: true,
};

describe("loginSchema", () => {
  it("하이픈 포함 전화번호를 허용한다(서버가 정규화, 가이드 11장)", () => {
    expect(loginSchema.safeParse({ phone: "010-1234-5678", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ phone: "01012345678", password: "x" }).success).toBe(true);
  });

  it("숫자·하이픈 외 문자는 거부한다", () => {
    expect(loginSchema.safeParse({ phone: "010abc5678", password: "x" }).success).toBe(false);
  });

  it("숫자 9~11자리만 허용한다(02 지역번호~휴대폰)", () => {
    expect(loginSchema.safeParse({ phone: "010-123", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ phone: "02-123-4567", password: "x" }).success).toBe(true); // 9자리(02-123-4567)
    expect(loginSchema.safeParse({ phone: "02-123-456", password: "x" }).success).toBe(false); // 8자리 거부
    expect(loginSchema.safeParse({ phone: "0101-2345-6789", password: "x" }).success).toBe(false); // 12자리 거부
  });

  it("빈 비밀번호는 거부한다(길이 정책은 로그인엔 미적용)", () => {
    expect(loginSchema.safeParse({ phone: "010-1234-5678", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ phone: "010-1234-5678", password: "1" }).success).toBe(true);
  });
});

describe("signupSchema", () => {
  it("유효한 입력을 통과시킨다", () => {
    expect(signupSchema.safeParse(validSignup).success).toBe(true);
  });

  it("검수: 비밀번호 7자는 거부, 8자는 통과(특수문자·대소문자 강제 없음 — 12장)", () => {
    expect(
      signupSchema.safeParse({ ...validSignup, password: "1234567", passwordConfirm: "1234567" })
        .success,
    ).toBe(false);
    expect(
      signupSchema.safeParse({ ...validSignup, password: "12345678", passwordConfirm: "12345678" })
        .success,
    ).toBe(true);
  });

  it("비밀번호 확인 불일치는 passwordConfirm 필드 오류", () => {
    const r = signupSchema.safeParse({ ...validSignup, passwordConfirm: "different1" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("passwordConfirm"))).toBe(true);
    }
  });

  it("이메일은 선택(빈 문자열 허용), 형식 오류는 거부", () => {
    expect(signupSchema.safeParse({ ...validSignup, email: "" }).success).toBe(true);
    expect(signupSchema.safeParse({ ...validSignup, email: "a@b.co" }).success).toBe(true);
    expect(signupSchema.safeParse({ ...validSignup, email: "not-an-email" }).success).toBe(false);
  });

  it("검수2: 약관 한쪽만 동의하면 거부한다", () => {
    expect(signupSchema.safeParse({ ...validSignup, termsAgreed: false }).success).toBe(false);
    expect(signupSchema.safeParse({ ...validSignup, privacyAgreed: false }).success).toBe(false);
  });

  it("이름 누락은 거부한다", () => {
    expect(signupSchema.safeParse({ ...validSignup, name: "" }).success).toBe(false);
  });
});

describe("agreementsSchema", () => {
  it("둘 다 true만 통과한다", () => {
    expect(agreementsSchema.safeParse({ termsAgreed: true, privacyAgreed: true }).success).toBe(true);
    expect(agreementsSchema.safeParse({ termsAgreed: true, privacyAgreed: false }).success).toBe(false);
    expect(agreementsSchema.safeParse({ termsAgreed: false, privacyAgreed: true }).success).toBe(false);
  });
});
