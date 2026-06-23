import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ABOUT, VISION } from "@/constants/content";
import AboutPage from "./page";

afterEach(() => vi.unstubAllGlobals());

describe("AboutPage", () => {
  it("라벨·대표문구·소개·상징색·소망·비전·이야기를 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<AboutPage />);
    expect(screen.getByText(ABOUT.title)).toBeDefined();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(ABOUT.statement);
    expect(screen.getByText(ABOUT.intro[0])).toBeDefined();
    expect(screen.getByText(ABOUT.symbolism[0].lines[0])).toBeDefined();
    expect(screen.getByText(ABOUT.hope.body)).toBeDefined();
    expect(screen.getByText(VISION.points[0])).toBeDefined();
    expect(screen.getByText(ABOUT.story.paragraphs[0])).toBeDefined();
  });
});
