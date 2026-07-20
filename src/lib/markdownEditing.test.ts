import { describe, it, expect } from "vitest";
import { applyInline, applyLine, insertInline, insertBlock } from "./markdownEditing";

describe("applyInline", () => {
  it("선택 영역을 마커로 감싼다", () => {
    expect(applyInline("안녕 교회", 3, 5, "bold")).toEqual({
      text: "안녕 **교회**",
      selStart: 5,
      selEnd: 7,
    });
  });

  it("선택이 없으면 자리표시 문구를 넣고 문구만 선택한다", () => {
    expect(applyInline("", 0, 0, "bold")).toEqual({
      text: "**굵은 글씨**",
      selStart: 2,
      selEnd: 7,
    });
  });

  it("기울임·취소선 자리표시 문구", () => {
    expect(applyInline("", 0, 0, "italic").text).toBe("*기울인 글씨*");
    expect(applyInline("", 0, 0, "strike").text).toBe("~~지운 글씨~~");
  });

  it("이미 감싸진 선택은 해제한다(토글)", () => {
    expect(applyInline("**교회**", 2, 4, "bold")).toEqual({
      text: "교회",
      selStart: 0,
      selEnd: 2,
    });
  });

  it("마커까지 통째로 선택해도 해제한다", () => {
    expect(applyInline("**교회**", 0, 6, "bold")).toEqual({
      text: "교회",
      selStart: 0,
      selEnd: 2,
    });
  });

  it("굵게 안에서 기울임을 누르면 겹쳐 적용된다(***)", () => {
    expect(applyInline("**교회**", 2, 4, "italic").text).toBe("***교회***");
  });
});

describe("applyLine", () => {
  it("줄 앞에 제목 접두를 붙이고 줄 전체를 선택한다", () => {
    expect(applyLine("환영합니다", 2, 2, "h2")).toEqual({
      text: "## 환영합니다",
      selStart: 0,
      selEnd: 8,
    });
  });

  it("제목 단계를 교체한다", () => {
    expect(applyLine("## 제목", 3, 3, "h3").text).toBe("### 제목");
  });

  it("같은 제목을 다시 누르면 해제한다", () => {
    expect(applyLine("### 제목", 0, 0, "h3").text).toBe("제목");
  });

  it("선택이 걸친 여러 줄에 글머리를 붙이고 빈 줄은 건너뛴다", () => {
    expect(applyLine("가\n\n나", 0, 4, "ul").text).toBe("- 가\n\n- 나");
  });

  it("모든 줄에 이미 글머리가 있으면 전부 해제한다", () => {
    expect(applyLine("- 가\n- 나", 0, 7, "ul").text).toBe("가\n나");
  });

  it("번호 목록은 1부터 차례로 매긴다", () => {
    expect(applyLine("가\n나", 0, 3, "ol").text).toBe("1. 가\n2. 나");
  });

  it("인용 접두를 붙인다", () => {
    expect(applyLine("말씀", 0, 0, "quote").text).toBe("> 말씀");
  });
});

describe("insertInline", () => {
  it("선택을 스니펫으로 교체하고 커서를 뒤에 둔다", () => {
    expect(insertInline("가나다", 1, 2, "[x](y)")).toEqual({
      text: "가[x](y)다",
      selStart: 7,
      selEnd: 7,
    });
  });
});

describe("insertBlock", () => {
  it("본문 중간이면 앞뒤에 빈 줄을 만든다", () => {
    expect(insertBlock("가\n나", 1, 1, "---")).toEqual({
      text: "가\n\n---\n\n나",
      selStart: 6,
      selEnd: 6,
    });
  });

  it("빈 문서면 블록만 넣는다", () => {
    expect(insertBlock("", 0, 0, "---").text).toBe("---");
  });

  it("이미 빈 줄이 있으면 더 추가하지 않는다", () => {
    expect(insertBlock("가\n\n", 3, 3, "---").text).toBe("가\n\n---");
  });
});
