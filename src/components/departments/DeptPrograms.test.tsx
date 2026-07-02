import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeptPrograms } from "./DeptPrograms";
import type { DeptProgram } from "@/constants/departments";

afterEach(() => vi.unstubAllGlobals());

const items: DeptProgram[] = [
  { name: "여름 수련회", desc: "자연 속에서 하나님과 더 가까워지는 시간" },
  { name: "겨울 수련회", desc: "한 해를 마무리하며 새로운 다짐을 세우는 시간" },
];

describe("DeptPrograms", () => {
  it("헤딩과 프로그램 카드(이름+설명)를 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<DeptPrograms heading="특별 프로그램" items={items} />);
    expect(screen.getByRole("heading", { name: "특별 프로그램" })).toBeDefined();
    for (const p of items) {
      expect(screen.getByText(p.name)).toBeDefined();
      expect(screen.getByText(p.desc)).toBeDefined();
    }
  });
});
