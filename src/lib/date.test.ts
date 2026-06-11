import { describe, it, expect } from "vitest";
import { parseServerDate } from "./date";

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
