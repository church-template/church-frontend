import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MINISTRY, MINISTRIES } from "@/constants/content";
import { MinistryCards } from "./MinistryCards";

afterEach(() => vi.unstubAllGlobals());

describe("MinistryCards", () => {
  it("섹션 헤딩과 사역 카드 3장(아이콘 포함)을 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(<MinistryCards />);
    expect(screen.getByRole("heading", { name: MINISTRY.title })).toBeDefined();
    for (const m of MINISTRIES) {
      expect(screen.getByText(m.title)).toBeDefined();
      expect(screen.getByText(m.desc)).toBeDefined();
    }
    expect(container.querySelectorAll("svg").length).toBe(3);
  });
});
