import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeptInfo } from "./DeptInfo";
import type { DeptInfoItem } from "@/constants/departments";

afterEach(() => vi.unstubAllGlobals());

const items: DeptInfoItem[] = [
  { label: "담당자", value: "학생부 담당 선생님" },
  { label: "연락처", value: "041-337-2298" },
];

describe("DeptInfo", () => {
  it("헤딩과 label/value 카드를 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<DeptInfo heading="알림 사항" items={items} />);
    expect(screen.getByRole("heading", { name: "알림 사항" })).toBeDefined();
    expect(screen.getByText("담당자")).toBeDefined();
    expect(screen.getByText("학생부 담당 선생님")).toBeDefined();
    expect(screen.getByText("041-337-2298")).toBeDefined();
  });
});
