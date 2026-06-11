import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WORSHIP, WORSHIP_SERVICES } from "@/constants/content";
import WorshipPage from "./page";

describe("WorshipPage", () => {
  it("제목과 예배 시간 카드를 렌더한다", () => {
    render(<WorshipPage />);
    expect(screen.getByText(WORSHIP.title)).toBeDefined();
    expect(screen.getByText(WORSHIP_SERVICES[0].name)).toBeDefined();
    expect(screen.getByText(WORSHIP_SERVICES[0].time)).toBeDefined();
    // 4종 전부 렌더되는지(slice 회귀 방지)
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(WORSHIP_SERVICES.length);
  });
});
