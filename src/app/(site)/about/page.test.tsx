import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ABOUT } from "@/constants/content";
import AboutPage from "./page";

describe("AboutPage", () => {
  it("제목과 소개 본문을 렌더한다", () => {
    render(<AboutPage />);
    expect(screen.getByText(ABOUT.title)).toBeDefined();
    expect(screen.getByText(ABOUT.paragraphs[0])).toBeDefined();
  });
});
