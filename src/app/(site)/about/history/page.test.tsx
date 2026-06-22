import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HISTORY } from "@/constants/content";
import HistoryPage from "./page";

afterEach(() => vi.unstubAllGlobals());

describe("HistoryPage", () => {
  it("연혁 스토리(첫 시대 내용)를 렌더한다", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} })),
    );
    render(<HistoryPage />);
    // 첫 시대 제목·연도는 카드에 나타난다(좌측 aside는 사진만). getAllByText로 확인.
    expect(screen.getAllByText(HISTORY.items[0].text).length).toBeGreaterThan(0);
    expect(screen.getAllByText(HISTORY.items[0].year).length).toBeGreaterThan(0);
  });
});
