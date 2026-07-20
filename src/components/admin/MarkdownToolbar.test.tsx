import { describe, it, expect, vi, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownEditor } from "./MarkdownEditor";

// MediaPicker는 TanStack Query 의존 — 여기선 선택 확정 콜백만 검증한다.
vi.mock("./MediaPicker", () => ({
  MediaPicker: ({ open, onConfirm }: { open: boolean; onConfirm: (ids: number[]) => void }) =>
    open ? (
      <button type="button" onClick={() => onConfirm([3, 7])}>
        미디어 선택 확정
      </button>
    ) : null,
}));

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

  it("구분선 버튼이 본문 끝에 빈 줄과 함께 들어간다", () => {
    render(<Editor initial="본문" />);
    textarea().setSelectionRange(2, 2);
    fireEvent.click(screen.getByRole("button", { name: "구분선" }));
    expect(textarea().value).toBe("본문\n\n---");
  });
});

describe("MarkdownToolbar — 링크·유튜브", () => {
  it("주소가 http로 시작하지 않으면 에러를 보인다", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "링크" }));
    fireEvent.change(screen.getByLabelText("주소"), { target: { value: "example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "넣기" }));
    expect(screen.getByText("https:// 로 시작하는 주소를 입력해 주세요.")).toBeDefined();
  });

  it("문구와 주소로 링크를 넣는다", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "링크" }));
    fireEvent.change(screen.getByLabelText("표시할 문구 (선택)"), { target: { value: "교회 소개" } });
    fireEvent.change(screen.getByLabelText("주소"), { target: { value: "https://example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "넣기" }));
    expect(textarea().value).toBe("[교회 소개](https://example.com)");
  });

  it("문구가 비면 주소를 문구로 쓴다", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "링크" }));
    fireEvent.change(screen.getByLabelText("주소"), { target: { value: "https://example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "넣기" }));
    expect(textarea().value).toBe("[https://example.com](https://example.com)");
  });

  it("유튜브 주소가 아니면 에러를 보인다", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "유튜브" }));
    fireEvent.change(screen.getByLabelText("유튜브 주소"), { target: { value: "https://example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "넣기" }));
    expect(screen.getByText("유튜브 주소가 아닙니다.")).toBeDefined();
  });

  it("유튜브 주소를 단독 문단으로 넣는다", () => {
    render(<Editor initial="안녕" />);
    textarea().setSelectionRange(2, 2);
    fireEvent.click(screen.getByRole("button", { name: "유튜브" }));
    fireEvent.change(screen.getByLabelText("유튜브 주소"), {
      target: { value: "https://youtu.be/dQw4w9WgXcQ" },
    });
    fireEvent.click(screen.getByRole("button", { name: "넣기" }));
    expect(textarea().value).toBe("안녕\n\nhttps://youtu.be/dQw4w9WgXcQ");
  });
});

describe("MarkdownToolbar — 표", () => {
  it("표 버튼은 크기 입력 다이얼로그를 열고 기본 2×2 표를 넣는다", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "표" }));
    fireEvent.click(screen.getByRole("button", { name: "넣기" }));
    expect(textarea().value).toBe("| 제목1 | 제목2 |\n| --- | --- |\n|  |  |\n|  |  |");
  });

  it("표 크기를 바꿔 넣을 수 있다", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "표" }));
    fireEvent.change(screen.getByLabelText("열 수 (가로 칸)"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("행 수 (세로 줄)"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "넣기" }));
    expect(textarea().value).toBe("| 제목1 | 제목2 | 제목3 |\n| --- | --- | --- |\n|  |  |  |");
  });

  it("범위를 벗어난 크기는 에러를 보인다", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "표" }));
    fireEvent.change(screen.getByLabelText("열 수 (가로 칸)"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "넣기" }));
    expect(screen.getByText("열은 1~8, 행은 1~20 사이로 입력해 주세요.")).toBeDefined();
  });
});

describe("MarkdownToolbar — 이미지", () => {
  it("선택한 미디어가 media 코드 단독 문단으로 들어간다", () => {
    render(<Editor initial="본문" />);
    textarea().setSelectionRange(2, 2);
    fireEvent.click(screen.getByRole("button", { name: "이미지" }));
    fireEvent.click(screen.getByRole("button", { name: "미디어 선택 확정" }));
    expect(textarea().value).toBe("본문\n\nmedia:3\n\nmedia:7");
  });
});

// jsdom엔 execCommand가 없어 평소엔 폴백만 검증된다 — 실브라우저처럼 execCommand가 존재하는 상황을 모사한다.
describe("MarkdownToolbar — 실브라우저 execCommand 경로", () => {
  afterEach(() => {
    delete (document as { execCommand?: unknown }).execCommand;
  });

  it("직접 버튼은 네이티브 삽입에 결과 텍스트를 전달한다", () => {
    const exec = vi.fn(() => true);
    document.execCommand = exec;
    render(<Editor initial="안녕" />);
    textarea().setSelectionRange(0, 2);
    fireEvent.click(screen.getByRole("button", { name: "굵게" }));
    expect(exec).toHaveBeenCalledWith("insertText", false, "**안녕**");
  });

  it("Dialog 삽입은 네이티브를 우회해 본문을 갱신한다(포커스 트랩 회귀)", () => {
    // 실브라우저: Dialog가 열린 채라 포커스 트랩이 focus()를 되가져가 execCommand가 엉뚱한 입력에 꽂히고 true를 반환한다
    const exec = vi.fn(() => true);
    document.execCommand = exec;
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "링크" }));
    fireEvent.change(screen.getByLabelText("주소"), { target: { value: "https://example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "넣기" }));
    expect(exec).not.toHaveBeenCalled();
    expect(textarea().value).toBe("[https://example.com](https://example.com)");
  });
});

describe("MarkdownToolbar — 도움말", () => {
  it("도움말 버튼이 사용법 안내를 연다", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "마크다운 사용법" }));
    expect(screen.getByRole("heading", { name: "마크다운 사용법" })).toBeDefined();
  });
});
