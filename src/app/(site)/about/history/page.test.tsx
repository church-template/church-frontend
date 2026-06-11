import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HISTORY } from "@/constants/content";
import HistoryPage from "./page";

describe("HistoryPage", () => {
  it("제목과 연혁 항목(연도·내용)을 렌더한다", () => {
    render(<HistoryPage />);
    expect(screen.getByText(HISTORY.title)).toBeDefined();
    expect(screen.getByText(HISTORY.items[0].year)).toBeDefined();
    expect(screen.getByText(HISTORY.items[0].text)).toBeDefined();
  });
});
