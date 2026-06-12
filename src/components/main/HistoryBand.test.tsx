import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HISTORY } from "@/constants/content";
import { HistoryBand } from "./HistoryBand";

afterEach(() => vi.unstubAllGlobals());

describe("HistoryBand", () => {
  it("연혁 항목을 연도 배지·헤드라인·설명 카드로 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<HistoryBand />);
    for (const item of HISTORY.items) {
      expect(screen.getByText(item.year)).toBeDefined();
      expect(screen.getByText(item.text)).toBeDefined();
      expect(screen.getByText(item.desc)).toBeDefined();
    }
  });
});
