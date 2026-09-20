import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("회원 전용 영역을 차단하고 sitemap을 가리킨다", () => {
    const res = robots();
    const rules = Array.isArray(res.rules) ? res.rules[0] : res.rules;
    const disallow = rules?.disallow ?? [];
    for (const path of [
      "/mypage/",
      "/sermons",
      "/gallery",
      "/challenges",
      "/vehicle-runs",
    ]) {
      expect(disallow).toContain(path);
    }
    expect(res.sitemap).toBe("https://www.eunsaem.com/sitemap.xml");
  });
});
