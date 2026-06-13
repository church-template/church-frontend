import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TermsDialog } from "./TermsDialog";
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from "@/constants/terms";

describe("TermsDialog", () => {
  it("전문 보기 클릭 시 약관 제목과 본문이 담긴 다이얼로그가 열린다", () => {
    render(<TermsDialog doc={{ title: "이용약관", body: "제1조 (목적) 본 약관은…" }} />);
    fireEvent.click(screen.getByRole("button", { name: "전문 보기" }));
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("이용약관")).toBeDefined();
    expect(screen.getByText(/제1조 \(목적\)/)).toBeDefined();
  });

  it("약관 상수 2종은 제목·본문을 갖는다", () => {
    for (const doc of [TERMS_OF_SERVICE, PRIVACY_POLICY]) {
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.body.length).toBeGreaterThan(50);
    }
  });
});
