import { describe, it, expect } from "vitest";
import { toServerDateTime, toLocalInput, parseServerDate } from "./date";

describe("toServerDateTime", () => {
  it("datetime-local(분 단위)에 초를 보강한다", () => {
    expect(toServerDateTime("2026-06-14T10:00")).toBe("2026-06-14T10:00:00");
  });
  it("allDay면 날짜만 자정으로 직렬화한다", () => {
    expect(toServerDateTime("2026-06-14", true)).toBe("2026-06-14T00:00:00");
  });
  it("datetime-local 값에도 allDay면 날짜 부분만 쓴다", () => {
    expect(toServerDateTime("2026-06-14T10:00", true)).toBe("2026-06-14T00:00:00");
  });
  it("빈 값은 빈 문자열", () => {
    expect(toServerDateTime("")).toBe("");
  });
});

describe("toLocalInput", () => {
  it("서버 문자열을 datetime-local로 슬라이스한다", () => {
    expect(toLocalInput("2026-06-14T10:00:00")).toBe("2026-06-14T10:00");
  });
  it("allDay면 날짜만 슬라이스한다", () => {
    expect(toLocalInput("2026-06-14T00:00:00", true)).toBe("2026-06-14");
  });
  it("빈 값은 빈 문자열", () => {
    expect(toLocalInput("")).toBe("");
  });
});

describe("round-trip", () => {
  it("toServerDateTime 결과를 parseServerDate가 동일 KST로 읽는다", () => {
    const server = toServerDateTime("2026-06-14T10:00");
    expect(parseServerDate(server).getTime()).toBe(Date.UTC(2026, 5, 14, 1, 0, 0)); // 10:00 KST = 01:00 UTC
  });
});
