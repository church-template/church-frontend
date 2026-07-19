import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MarkdownContent } from "./MarkdownContent";

describe("MarkdownContent", () => {
  it("마크다운을 렌더하고 prose-church 클래스를 적용한다", () => {
    const { container } = render(<MarkdownContent source="# 제목" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("prose-church");
    expect(root.querySelector("h1")?.textContent).toBe("제목");
  });

  it("<script>는 렌더되지 않는다", () => {
    const { container } = render(
      <MarkdownContent source={'본문\n\n<script>alert(1)</script>'} />,
    );
    expect(container.querySelector("script")).toBeNull();
  });

  it("단독 문단 유튜브 링크는 링크 대신 임베드(썸네일 facade)로 렌더한다", () => {
    const { container } = render(
      <MarkdownContent source={"본문\n\nhttps://youtube.com/live/wYgQwHYvxEo?feature=share"} />,
    );
    expect(
      container.querySelector('img[src*="img.youtube.com/vi/wYgQwHYvxEo"]'),
    ).not.toBeNull();
    expect(container.querySelector('a[href*="youtube"]')).toBeNull();
    expect(container.textContent).toContain("본문");
  });

  it("className prop을 prose-church와 병합한다", () => {
    const { container } = render(<MarkdownContent source="본문" className="mt-4" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toBe("prose-church mt-4");
  });
});
