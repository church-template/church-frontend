import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownEditor } from "./MarkdownEditor";

// 툴바는 textarea 선택 범위와 한 몸이라 MarkdownEditor를 통째 렌더해 통합 검증한다.
function Editor({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <MarkdownEditor value={value} onChange={setValue} />;
}

function textarea(): HTMLTextAreaElement {
  return screen.getByRole("textbox") as HTMLTextAreaElement;
}

describe("MarkdownToolbar — 기본 서식", () => {
  it("선택 영역을 굵게로 감싼다", () => {
    render(<Editor initial="안녕 교회" />);
    textarea().setSelectionRange(3, 5);
    fireEvent.click(screen.getByRole("button", { name: "굵게" }));
    expect(textarea().value).toBe("안녕 **교회**");
  });

  it("선택이 없으면 자리표시 문구가 들어간다", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "굵게" }));
    expect(textarea().value).toBe("**굵은 글씨**");
  });

  it("제목 버튼이 줄 앞에 접두를 붙인다", () => {
    render(<Editor initial="환영합니다" />);
    fireEvent.click(screen.getByRole("button", { name: "중간 제목" }));
    expect(textarea().value).toBe("## 환영합니다");
  });

  it("글머리 목록 버튼이 여러 줄에 접두를 붙인다", () => {
    render(<Editor initial={"가\n나"} />);
    textarea().setSelectionRange(0, 3);
    fireEvent.click(screen.getByRole("button", { name: "글머리 목록" }));
    expect(textarea().value).toBe("- 가\n- 나");
  });

  it("표 버튼이 표 템플릿을 넣는다", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "표" }));
    expect(textarea().value).toBe("| 항목 | 값 |\n| --- | --- |\n|  |  |");
  });

  it("구분선 버튼이 본문 끝에 빈 줄과 함께 들어간다", () => {
    render(<Editor initial="본문" />);
    textarea().setSelectionRange(2, 2);
    fireEvent.click(screen.getByRole("button", { name: "구분선" }));
    expect(textarea().value).toBe("본문\n\n---");
  });
});
