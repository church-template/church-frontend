import { describe, it, expect } from "vitest";
import { parseServerDate, formatDate, formatEventTime } from "./date";

describe("parseServerDate", () => {
  it("datetime을 KST(+09:00)로 해석한다 — 10:00 KST = 01:00 UTC", () => {
    // getTime()은 런타임 TZ와 무관한 절대 epoch ms → TZ 독립 검증.
    expect(parseServerDate("2026-06-14T10:00:00").getTime()).toBe(
      Date.UTC(2026, 5, 14, 1, 0, 0),
    );
  });

  it("date-only(YYYY-MM-DD)는 KST 자정으로 해석한다", () => {
    expect(parseServerDate("2026-06-14").getTime()).toBe(
      Date.UTC(2026, 5, 13, 15, 0, 0), // 2026-06-14 00:00 KST = 2026-06-13 15:00 UTC
    );
  });
});

describe("formatDate", () => {
  it("date 전용 문자열을 'YYYY. M. D.'로 표기한다", () => {
    expect(formatDate("2026-06-01")).toBe("2026. 6. 1.");
  });

  it("datetime 문자열도 날짜만 표기한다", () => {
    expect(formatDate("2026-06-14T10:00:00")).toBe("2026. 6. 14.");
  });
});

describe("formatEventTime", () => {
  it("allDay 단일일은 null(시간 생략, 날짜는 배지 담당)", () => {
    expect(formatEventTime("2026-06-14T00:00:00", null, true)).toBeNull();
  });

  it("allDay 여러 날은 종료일만 '~ M. D.'", () => {
    expect(formatEventTime("2026-06-14T00:00:00", "2026-06-15T00:00:00", true)).toBe(
      "~ 6. 15.",
    );
  });

  it("endAt 없으면 시작 시각만", () => {
    expect(formatEventTime("2026-06-14T10:00:00", null, false)).toBe("10:00");
  });

  it("같은 날 범위는 '시각 ~ 시각'", () => {
    expect(formatEventTime("2026-06-14T10:00:00", "2026-06-14T12:00:00", false)).toBe(
      "10:00 ~ 12:00",
    );
  });

  it("다른 날 범위는 종료일을 한정해 표기한다", () => {
    expect(formatEventTime("2026-06-14T10:00:00", "2026-06-15T12:00:00", false)).toBe(
      "10:00 ~ 6. 15. 12:00",
    );
  });

  it("allDay에 같은 날 endAt이 와도 null(시간 생략)", () => {
    expect(
      formatEventTime("2026-06-14T00:00:00", "2026-06-14T00:00:00", true),
    ).toBeNull();
  });
});
