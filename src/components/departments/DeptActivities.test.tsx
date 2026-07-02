import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeptActivities } from "./DeptActivities";

afterEach(() => vi.unstubAllGlobals());

const items = ["토요일 학생 예배 및 성경공부", "여름·겨울 수련회 참가", "찬양과 율동 활동"];

describe("DeptActivities", () => {
  it("헤딩과 활동 항목을 목록으로 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<DeptActivities heading="주요 활동" items={items} />);
    expect(screen.getByRole("heading", { name: "주요 활동" })).toBeDefined();
    for (const item of items) {
      expect(screen.getByText(item)).toBeDefined();
    }
    expect(screen.getAllByRole("listitem")).toHaveLength(items.length);
  });
});
