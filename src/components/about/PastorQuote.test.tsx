import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PASTOR } from "@/constants/content";
import { PastorQuote } from "./PastorQuote";

afterEach(() => vi.unstubAllGlobals());

describe("PastorQuote", () => {
  it("핵심 인용문과 직분·이름 배지를 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(<PastorQuote />);
    expect(screen.getByText(PASTOR.pullQuote)).toBeDefined();
    expect(screen.getByText(`${PASTOR.position} ${PASTOR.name}`)).toBeDefined();
    // 장식 인용 글리프(lucide) 존재
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
