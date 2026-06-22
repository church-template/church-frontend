import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HISTORY } from "@/constants/content";
import { HistoryBand } from "./HistoryBand";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

afterEach(() => vi.unstubAllGlobals());

describe("HistoryBand", () => {
  it("연혁 항목을 연도 배지·헤드라인·설명으로 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<HistoryBand />);
    for (const item of HISTORY.items) {
      expect(screen.getByText(item.year)).toBeDefined();
      expect(screen.getByText(item.text)).toBeDefined();
      if (item.desc) expect(screen.getByText(item.desc)).toBeDefined();
    }
  });

  it("'전체 연혁 보기' 링크가 /about/history를 가리킨다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<HistoryBand />);
    const link = screen.getByText("전체 연혁 보기");
    expect(link.getAttribute("href")).toBe("/about/history");
  });
});
