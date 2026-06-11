import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WORSHIP, WORSHIP_SERVICES } from "@/constants/content";
import { WorshipSection } from "./WorshipSection";

describe("WorshipSection", () => {
  it("타이틀과 모든 예배 카드를 렌더한다", () => {
    render(<WorshipSection />);
    expect(screen.getByText(WORSHIP.title)).toBeDefined();
    for (const s of WORSHIP_SERVICES) {
      expect(screen.getByText(s.name)).toBeDefined();
      expect(screen.getByText(s.time)).toBeDefined();
    }
  });
});
