import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ABOUT } from "@/constants/content";
import { VisionHero } from "./VisionHero";

afterEach(() => vi.unstubAllGlobals());

describe("VisionHero", () => {
  it("라벨·대표문구(강조어 포함)·인트로·로고를 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<VisionHero />);
    expect(screen.getByText(ABOUT.title)).toBeDefined();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toContain(ABOUT.statement);
    expect(h1.textContent).toContain(ABOUT.statementHighlight);
    expect(screen.getByText(ABOUT.intro[0])).toBeDefined();
    expect(screen.getByText(ABOUT.intro[1])).toBeDefined();
    expect(screen.getByAltText("은샘침례교회 로고")).toBeDefined();
  });
});
