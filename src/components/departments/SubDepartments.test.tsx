import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { SubDepartments } from "./SubDepartments";
import { DEPT_PAGE, type Department } from "@/constants/departments";

afterEach(() => vi.unstubAllGlobals());

const items: Department[] = [
  { slug: "middle", name: "중등부", description: "", media: { type: "image", src: "/dept/middle.jpg" }, caption: [] },
  { slug: "high", name: "고등부", description: "", media: { type: "image", src: "/dept/high.jpg" }, caption: [] },
];

describe("SubDepartments", () => {
  it("하위 부서 헤딩과 카드들을 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true }))); // Reveal IO 미등록
    render(<SubDepartments items={items} />);
    expect(screen.getByRole("heading", { name: DEPT_PAGE.subHeading })).toBeDefined();
    expect(screen.getByText("중등부").closest("a")?.getAttribute("href")).toBe("/departments/middle");
    expect(screen.getByText("고등부")).toBeDefined();
  });
});
