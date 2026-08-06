// T9(상세 URL 확장)에서 fetch 목킹 케이스가 추가된다. 지금은 수집 경계만 검증.
import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("회원 전용 경로를 포함하지 않는다", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://eunsaem.com/notices");
    expect(urls).toContain("https://eunsaem.com/bulletins");
    expect(urls.some((u) => u.includes("/sermons"))).toBe(false);
    expect(urls.some((u) => u.includes("/gallery"))).toBe(false);
    expect(urls.some((u) => u.includes("/challenges"))).toBe(false);
  });
});
