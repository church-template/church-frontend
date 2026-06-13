// src/components/auth/formatPhone.test.ts
import { describe, it, expect } from "vitest";
import { formatPhone } from "./formatPhone";

describe("formatPhone", () => {
  it("휴대폰 11자리를 010-1234-5678로 끊는다", () => {
    expect(formatPhone("01012345678")).toBe("010-1234-5678");
  });

  it("이미 하이픈이 있어도 동일하게(멱등) 포맷한다", () => {
    expect(formatPhone("010-1234-5678")).toBe("010-1234-5678");
  });

  it("입력 중간 상태도 자연스럽게 끊는다(진행형)", () => {
    expect(formatPhone("010")).toBe("010");
    expect(formatPhone("0101")).toBe("010-1");
    expect(formatPhone("0101234")).toBe("010-1234");
    expect(formatPhone("01012345")).toBe("010-1234-5");
  });

  it("서울(02)은 2자리 지역번호로 끊는다", () => {
    expect(formatPhone("0212345678")).toBe("02-1234-5678");
    expect(formatPhone("02")).toBe("02");
    expect(formatPhone("021234")).toBe("02-1234");
  });

  it("숫자가 아닌 문자는 제거한다", () => {
    expect(formatPhone("010 1234 5678")).toBe("010-1234-5678");
    expect(formatPhone("010.1234.5678")).toBe("010-1234-5678");
    expect(formatPhone("a010b1234c5678")).toBe("010-1234-5678");
  });

  it("11자리를 넘는 입력은 잘라낸다", () => {
    expect(formatPhone("010123456789999")).toBe("010-1234-5678");
  });

  it("빈 문자열은 빈 문자열", () => {
    expect(formatPhone("")).toBe("");
  });
});
