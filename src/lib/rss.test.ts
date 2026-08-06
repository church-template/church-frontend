import { describe, expect, it } from "vitest";
import { buildRssXml, escapeXml } from "./rss";

describe("escapeXml", () => {
  it("XML 특수문자 5종을 이스케이프한다", () => {
    expect(escapeXml(`<a & "b" 'c'>`)).toBe(
      "&lt;a &amp; &quot;b&quot; &apos;c&apos;&gt;",
    );
  });
});

describe("buildRssXml", () => {
  it("채널·아이템 구조를 만들고 내용을 이스케이프한다", () => {
    const xml = buildRssXml(
      { title: "은샘교회", link: "https://eunsaem.com", description: "설명" },
      [
        {
          title: "공지 <1>",
          link: "https://eunsaem.com/notices/1",
          pubDate: new Date(Date.UTC(2026, 7, 1)),
          description: "본문",
        },
      ],
    );
    expect(xml).toContain(`<rss version="2.0">`);
    expect(xml).toContain("<title>공지 &lt;1&gt;</title>");
    expect(xml).toContain("01 Aug 2026");
    expect(xml).toContain("<guid>https://eunsaem.com/notices/1</guid>");
  });

  it("아이템이 없어도 유효한 채널을 만든다", () => {
    const xml = buildRssXml({ title: "t", link: "l", description: "d" }, []);
    expect(xml).toContain("<channel>");
    expect(xml).not.toContain("<item>");
  });
});
