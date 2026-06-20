import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ABOUT } from "@/constants/content";
import AboutPage from "./page";

describe("AboutPage", () => {
  it("제목·선언문·소개·상징색·소망·이야기를 렌더한다", () => {
    render(<AboutPage />);
    expect(screen.getByText(ABOUT.title)).toBeDefined();
    expect(screen.getByText(ABOUT.statement)).toBeDefined();
    expect(screen.getByText(ABOUT.intro[0])).toBeDefined();
    expect(screen.getByText(ABOUT.symbolism[0].lines[0])).toBeDefined(); // "전능하신 하나님의"
    expect(screen.getByText(ABOUT.hope.heading)).toBeDefined();
    expect(screen.getByText(ABOUT.hope.body)).toBeDefined();
    expect(screen.getByText(ABOUT.story.heading)).toBeDefined();
    expect(screen.getByText(ABOUT.story.paragraphs[0])).toBeDefined();
  });
});
