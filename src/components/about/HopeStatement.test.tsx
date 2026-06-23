import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ABOUT } from "@/constants/content";
import { HopeStatement } from "./HopeStatement";

afterEach(() => vi.unstubAllGlobals());

describe("HopeStatement", () => {
  it("소망 소제목과 본문을 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<HopeStatement />);
    expect(screen.getByText(ABOUT.hope.heading)).toBeDefined();
    expect(screen.getByText(ABOUT.hope.body)).toBeDefined();
  });
});
