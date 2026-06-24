import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { VISION } from "@/constants/content";
import { VisionGoals } from "./VisionGoals";

afterEach(() => vi.unstubAllGlobals());

describe("VisionGoals", () => {
  it("비전 제목과 6개 항목·아이콘을 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(<VisionGoals />);
    expect(screen.getByText(VISION.title)).toBeDefined();
    VISION.points.forEach((point) => {
      expect(screen.getByText(point)).toBeDefined();
    });
    // 항목마다 lucide 아이콘(svg) 1개
    expect(container.querySelectorAll("svg").length).toBe(VISION.points.length);
  });
});
