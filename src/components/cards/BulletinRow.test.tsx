import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BulletinRow } from "./BulletinRow";

describe("BulletinRow", () => {
  it("제목·날짜·작성자를 렌더하고 행 전체가 새 탭 PDF 링크다", () => {
    render(
      <BulletinRow
        title="6월 둘째 주 주보"
        date="2026. 6. 7."
        author="김집사"
        pdfUrl="/api/media/31"
      />,
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/api/media/31");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByText("6월 둘째 주 주보")).toBeDefined();
    expect(screen.getByText("2026. 6. 7.")).toBeDefined();
    expect(screen.getByText("김집사")).toBeDefined();
  });

  it("새 탭 열림을 스크린리더에 안내한다(sr-only)", () => {
    render(<BulletinRow title="t" date="d" pdfUrl="/api/media/1" />);
    expect(screen.getByText("(새 탭에서 PDF 열림)")).toBeDefined();
  });

  it("author가 없으면 작성자 줄을 렌더하지 않는다", () => {
    render(<BulletinRow title="t" date="d" author={null} pdfUrl="/api/media/1" />);
    // 링크 전체 텍스트 = 제목 + sr-only 안내 + 날짜뿐 — 작성자 줄 없음
    expect(screen.getByRole("link").textContent).toBe("t(새 탭에서 PDF 열림)d");
  });

  it("서버 마스킹 값('(탈퇴한 사용자)' 등)은 그대로 표기한다", () => {
    render(
      <BulletinRow title="t" date="d" author="(탈퇴한 사용자)" pdfUrl="/api/media/1" />,
    );
    expect(screen.getByText("(탈퇴한 사용자)")).toBeDefined();
  });
});
