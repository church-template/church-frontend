import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { DepartmentCard } from "./DepartmentCard";
import { DEPT_PAGE, type Department } from "@/constants/departments";

const dept: Department = {
  slug: "youth",
  name: "청년부",
  leader: "김목사",
  description: "",
  media: { type: "image", src: "/dept/youth.jpg", alt: "청년부" },
  caption: [],
};

describe("DepartmentCard", () => {
  it("이름·인도자·썸네일·상세 링크를 렌더한다", () => {
    const { container } = render(<DepartmentCard dept={dept} />);
    expect(screen.getByText("청년부")).toBeDefined();
    expect(screen.getByText(`${DEPT_PAGE.leaderLabel} · 김목사`)).toBeDefined();
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/dept/youth.jpg");
    expect(screen.getByText("청년부").closest("a")?.getAttribute("href")).toBe("/departments/youth");
  });

  it("인도자가 비면 인도 줄을 생략한다", () => {
    render(<DepartmentCard dept={{ ...dept, leader: undefined }} />);
    expect(screen.queryByText(/인도 ·/)).toBeNull();
  });
});
