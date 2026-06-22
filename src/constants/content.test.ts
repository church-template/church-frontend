import { describe, it, expect } from "vitest";
import { HISTORY } from "./content";

describe("HISTORY 데이터", () => {
  it("7개 항목 모두 고유 id를 가진다", () => {
    const ids = HISTORY.items.map((i) => i.id);
    expect(ids.length).toBe(7);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("모든 항목이 필수 필드를 가진다", () => {
    for (const item of HISTORY.items) {
      expect(item.year).toBeTruthy();
      expect(item.text).toBeTruthy();
      expect(item.desc).toBeTruthy();
      expect(item.details.length).toBeGreaterThan(0);
      expect(item.significance).toBeTruthy();
    }
  });

  it("intro 한 줄을 가진다", () => {
    expect(HISTORY.intro).toBeTruthy();
  });
});
