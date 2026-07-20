import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownHelpDialog } from "./MarkdownHelpDialog";

describe("MarkdownHelpDialog", () => {
  it("문법 원문과 렌더 결과를 나란히 보여준다", () => {
    render(<MarkdownHelpDialog open onOpenChange={() => {}} />);
    expect(screen.getByText("# 큰 제목")).toBeDefined();
    expect(screen.getByRole("heading", { name: "큰 제목" })).toBeDefined();
  });

  it("서식 외 규칙 안내를 보여준다", () => {
    render(<MarkdownHelpDialog open onOpenChange={() => {}} />);
    expect(screen.getByText("문단을 나누려면 빈 줄을 한 줄 넣습니다.")).toBeDefined();
  });
});
