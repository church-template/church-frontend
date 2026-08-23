import { describe, expect, it } from "vitest";
import { excerpt, stripMarkdown } from "./seo";

describe("stripMarkdown", () => {
  it("마크다운 문법을 제거하고 평문만 남긴다", () => {
    const md =
      "# 제목\n\n**굵게** [링크](https://a.b)와 ![img](media:42)\n\n- 목록 항목\n\nmedia:7\n\n일반 문장.";
    expect(stripMarkdown(md)).toBe("제목 굵게 링크와 목록 항목 일반 문장.");
  });

  it("코드블록·인용·표·구분선을 제거한다", () => {
    const md = "> 인용\n\n```js\ncode();\n```\n\n| a | b |\n\n---\n\n끝";
    expect(stripMarkdown(md)).toBe("인용 a b 끝");
  });

  it("null·빈 값은 빈 문자열", () => {
    expect(stripMarkdown(null)).toBe("");
    expect(stripMarkdown(undefined)).toBe("");
    expect(stripMarkdown("")).toBe("");
  });
});

describe("excerpt", () => {
  it("최대 길이를 넘으면 말줄임한다", () => {
    const out = excerpt("가".repeat(200));
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("…")).toBe(true);
  });

  it("짧은 본문은 그대로 반환한다", () => {
    expect(excerpt("짧은 소개")).toBe("짧은 소개");
  });
});
