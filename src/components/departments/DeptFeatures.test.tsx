import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeptFeatures } from "./DeptFeatures";
import type { DeptFeature } from "@/constants/departments";

afterEach(() => vi.unstubAllGlobals());

const items: DeptFeature[] = [
  { icon: "book", title: "청소년 신앙 교육", desc: "성경 중심의 체계적 신앙 교육" },
  { icon: "users", title: "또래 교제", desc: "건전한 친구 관계와 공동체 의식" },
  { icon: "sparkles", title: "창의적 활동", desc: "재미있는 활동을 통한 전인적 성장" },
];

describe("DeptFeatures", () => {
  it("헤딩·리드와 기능 카드 3장(아이콘 포함)을 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(
      <DeptFeatures heading="학생부" lead="함께 성장해요" items={items} />,
    );
    expect(screen.getByRole("heading", { name: "학생부" })).toBeDefined();
    expect(screen.getByText("함께 성장해요")).toBeDefined();
    for (const f of items) {
      expect(screen.getByText(f.title)).toBeDefined();
      expect(screen.getByText(f.desc)).toBeDefined();
    }
    expect(container.querySelectorAll("svg").length).toBe(3);
  });

  it("lead가 없으면 리드 문단을 렌더하지 않는다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<DeptFeatures heading="학생부" items={items} />);
    expect(screen.getByRole("heading", { name: "학생부" })).toBeDefined();
  });
});
