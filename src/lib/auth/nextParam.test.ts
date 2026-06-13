import { describe, it, expect } from "vitest";
import { sanitizeNext, afterLoginDestination } from "./nextParam";

describe("sanitizeNext", () => {
  it("내부 경로는 그대로 허용한다", () => {
    expect(sanitizeNext("/gallery")).toBe("/gallery");
    expect(sanitizeNext("/sermons/1?tab=2")).toBe("/sermons/1?tab=2");
  });

  it("외부 URL은 홈으로 폴백한다(오픈 리다이렉트 방지)", () => {
    expect(sanitizeNext("https://evil.com")).toBe("/");
    expect(sanitizeNext("http://evil.com/login")).toBe("/");
  });

  it("프로토콜 상대 URL(//host)은 홈으로 폴백한다", () => {
    expect(sanitizeNext("//evil.com")).toBe("/");
  });

  it("백슬래시 변종(/\\evil.com)은 홈으로 폴백한다(브라우저가 \\를 /로 정규화)", () => {
    expect(sanitizeNext("/\\evil.com")).toBe("/");
  });

  it("제어문자가 섞인 경로는 홈으로 폴백한다(브라우저가 strip 후 //로 해석)", () => {
    expect(sanitizeNext("/\t/evil.com")).toBe("/");
    expect(sanitizeNext("/\n/evil.com")).toBe("/");
    expect(sanitizeNext("/\r/evil.com")).toBe("/");
  });

  it("null·undefined·빈 문자열은 홈", () => {
    expect(sanitizeNext(null)).toBe("/");
    expect(sanitizeNext(undefined)).toBe("/");
    expect(sanitizeNext("")).toBe("/");
  });
});

describe("afterLoginDestination", () => {
  it("재동의 불필요 시 next로 간다", () => {
    expect(afterLoginDestination(false, "/gallery")).toBe("/gallery");
  });

  it("재동의 불필요 + next 없음이면 홈", () => {
    expect(afterLoginDestination(false, null)).toBe("/");
  });

  it("재동의 필요 시 /agreements로 가고 next를 인코딩해 유지한다", () => {
    expect(afterLoginDestination(true, "/gallery")).toBe("/agreements?next=%2Fgallery");
  });

  it("재동의 필요 + next 없음이면 /agreements", () => {
    expect(afterLoginDestination(true, null)).toBe("/agreements");
  });

  it("재동의 필요 + 외부 next는 새니타이즈되어 /agreements만", () => {
    expect(afterLoginDestination(true, "https://evil.com")).toBe("/agreements");
  });
});
