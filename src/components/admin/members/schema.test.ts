import { describe, it, expect } from "vitest";
import { memberUpdateSchema } from "./schema";

const base = { name: "홍길동", phone: "010-1234-5678", email: "a@b.com" };

describe("memberUpdateSchema", () => {
  it("정상 값 통과", () => expect(memberUpdateSchema.safeParse(base).success).toBe(true));
  it("이메일 빈 문자열 통과(선택)", () => expect(memberUpdateSchema.safeParse({ ...base, email: "" }).success).toBe(true));
  it("이름 빈값 실패", () => expect(memberUpdateSchema.safeParse({ ...base, name: "" }).success).toBe(false));
  it("이메일 형식 오류 실패", () => expect(memberUpdateSchema.safeParse({ ...base, email: "not-email" }).success).toBe(false));
  it("전화 자릿수 오류 실패", () => expect(memberUpdateSchema.safeParse({ ...base, phone: "010-1" }).success).toBe(false));
});
