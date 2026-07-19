import { describe, it, expect } from "vitest";
import { renderMarkdown, splitYouTubeSegments } from "./markdown";

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

  it("본문 null·빈 문자열은 빈 HTML을 반환한다(서버 content null 500 방어)", () => {
    expect(renderMarkdown(null)).toBe("");
    expect(renderMarkdown("")).toBe("");
  });

  it("media:420이 media:42로 오탐되지 않는다(경계)", () => {
    // media:420은 전체가 매칭돼 /api/media/420이 되고, /api/media/42 + 잔여 "0"으로 쪼개지지 않아야 한다.
    const html = renderMarkdown("[링크](media:420)");
    expect(html).toContain("/api/media/420");
    expect(html).not.toContain('/api/media/42"');
  });
});

describe("splitYouTubeSegments", () => {
  it("단독 문단의 유튜브 URL을 임베드 세그먼트로 분리한다", () => {
    const segs = splitYouTubeSegments(
      "앞 문단\n\nhttps://youtube.com/live/wYgQwHYvxEo?feature=share\n\n뒷 문단",
    );
    expect(segs).toEqual([
      { type: "markdown", source: "앞 문단" },
      { type: "youtube", url: "https://youtube.com/live/wYgQwHYvxEo?feature=share", label: null },
      { type: "markdown", source: "뒷 문단" },
    ]);
  });

  it("[라벨](URL) 단독 문단은 라벨을 보존한다", () => {
    const segs = splitYouTubeSegments("[주일 설교](https://youtu.be/dQw4w9WgXcQ)");
    expect(segs).toEqual([
      { type: "youtube", url: "https://youtu.be/dQw4w9WgXcQ", label: "주일 설교" },
    ]);
  });

  it("문장 속 인라인 유튜브 링크는 분리하지 않는다(글 흐름 보존)", () => {
    const segs = splitYouTubeSegments("영상은 https://youtu.be/dQw4w9WgXcQ 참고");
    expect(segs).toEqual([
      { type: "markdown", source: "영상은 https://youtu.be/dQw4w9WgXcQ 참고" },
    ]);
  });

  it("비유튜브 링크 단독 문단은 마크다운으로 남는다", () => {
    const segs = splitYouTubeSegments("https://vimeo.com/123456");
    expect(segs).toEqual([{ type: "markdown", source: "https://vimeo.com/123456" }]);
  });

  it("null·빈 본문은 빈 배열", () => {
    expect(splitYouTubeSegments(null)).toEqual([]);
    expect(splitYouTubeSegments("")).toEqual([]);
  });
});
