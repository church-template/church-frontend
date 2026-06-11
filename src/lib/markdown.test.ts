import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("<script>를 통째로 제거한다", () => {
    const html = renderMarkdown('정상\n\n<script>alert(1)</script>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(1)");
  });

  it("양성 raw HTML(<div>)도 태그를 제거하되 내용은 보존한다", () => {
    const html = renderMarkdown("<div>hello</div>");
    expect(html).not.toContain("<div");
    expect(html).toContain("hello");
  });

  it("마크다운 강조는 보존한다", () => {
    expect(renderMarkdown("**굵게**")).toContain("<strong>굵게</strong>");
  });

  it("media:{id}를 공개 서빙 URL로 치환한다", () => {
    const html = renderMarkdown("![포스터](media:42)");
    expect(html).toContain('src="/api/media/42"');
  });

  it("media:420이 media:42로 오탐되지 않는다(경계)", () => {
    // media:420은 전체가 매칭돼 /api/media/420이 되고, /api/media/42 + 잔여 "0"으로 쪼개지지 않아야 한다.
    const html = renderMarkdown("[링크](media:420)");
    expect(html).toContain("/api/media/420");
    expect(html).not.toContain('/api/media/42"');
  });
});
