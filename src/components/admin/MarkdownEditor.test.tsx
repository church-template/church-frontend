import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownEditor } from "./MarkdownEditor";

describe("MarkdownEditor", () => {
  it("작성 탭에서 입력하면 onChange로 값을 올린다", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "안녕하세요" } });
    expect(onChange).toHaveBeenCalledWith("안녕하세요");
  });

  it("미리보기 탭으로 전환하면 마크다운이 HTML로 렌더된다", () => {
    render(<MarkdownEditor value={"# 환영합니다"} onChange={() => {}} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "미리보기" })); // Radix Tabs는 jsdom에서 click 미동작
    expect(screen.getByRole("heading", { name: "환영합니다" })).toBeDefined();
  });

  it("본문이 비어 있으면 미리보기에 안내문을 보인다", () => {
    render(<MarkdownEditor value="   " onChange={() => {}} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "미리보기" })); // Radix Tabs는 jsdom에서 click 미동작
    expect(screen.getByText("미리볼 내용이 없습니다.")).toBeDefined();
  });
});
