import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PASTOR } from "@/constants/content";
import { PastorDossier } from "./PastorDossier";

afterEach(() => vi.unstubAllGlobals());

describe("PastorDossier", () => {
  it("약력·철학 헤딩과 전 항목을 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<PastorDossier />);
    expect(screen.getByText(PASTOR.credentials.heading)).toBeDefined();
    for (const item of PASTOR.credentials.items) {
      expect(screen.getByText(item)).toBeDefined();
    }
    expect(screen.getByText(PASTOR.philosophy.heading)).toBeDefined();
    for (const item of PASTOR.philosophy.items) {
      expect(screen.getByText(item.text)).toBeDefined();
    }
  });

  it("철학 6항목마다 장식 아이콘(svg)을 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(<PastorDossier />);
    expect(container.querySelectorAll("svg").length).toBe(PASTOR.philosophy.items.length);
  });
});
