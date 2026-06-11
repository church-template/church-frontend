import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VISION } from "@/constants/content";
import VisionPage from "./page";

describe("VisionPage", () => {
  it("제목·선언문·비전 항목을 렌더한다", () => {
    render(<VisionPage />);
    expect(screen.getByText(VISION.title)).toBeDefined();
    expect(screen.getByText(VISION.statement)).toBeDefined();
    expect(screen.getByText(VISION.points[0])).toBeDefined();
  });
});
