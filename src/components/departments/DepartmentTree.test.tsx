import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { DepartmentTree } from "./DepartmentTree";
import type { Department } from "@/constants/departments";

const dept = (slug: string, name: string): Department => ({
  slug,
  name,
  description: "",
  media: { type: "image", src: `/dept/${slug}.jpg` },
  caption: [],
});

describe("DepartmentTree", () => {
  it("부서들을 카드 그리드로 렌더하고 각 카드가 상세로 링크된다", () => {
    render(<DepartmentTree departments={[dept("youth", "청년부"), dept("praise", "예배부")]} />);
    expect(screen.getByText("청년부").closest("a")?.getAttribute("href")).toBe("/departments/youth");
    expect(screen.getByText("예배부").closest("a")?.getAttribute("href")).toBe("/departments/praise");
  });
});
