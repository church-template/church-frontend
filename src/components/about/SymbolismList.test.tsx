import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ABOUT } from "@/constants/content";
import { SymbolismList } from "./SymbolismList";

afterEach(() => vi.unstubAllGlobals());

describe("SymbolismList", () => {
  it("헤딩·리드와 4색 색이름·제목·설명을 모두 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<SymbolismList />);
    expect(screen.getByText(ABOUT.symbolismHeading)).toBeDefined();
    expect(screen.getByText(ABOUT.symbolismLead)).toBeDefined();
    ABOUT.symbolism.forEach((symbol) => {
      expect(screen.getByText(`${symbol.color} · ${symbol.title}`)).toBeDefined();
      expect(screen.getByText(symbol.lines[0])).toBeDefined();
    });
  });
});
