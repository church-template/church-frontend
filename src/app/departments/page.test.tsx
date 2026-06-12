import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { DEPARTMENTS, DEPT_PAGE } from "@/constants/departments";

vi.mock("next/navigation", () => ({ usePathname: () => "/departments" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import DepartmentsPage from "./page";

function stubBrowserApis() {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} })));
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
}
afterEach(() => vi.unstubAllGlobals());

describe("DepartmentsPage (사역 목록)", () => {
  it("타이틀과 사역 부서 카드를 렌더한다(상수 구동)", () => {
    stubBrowserApis();
    render(<DepartmentsPage />);
    expect(screen.getByRole("heading", { name: DEPT_PAGE.title })).toBeDefined();
    // 카드 이름은 h3(level 3) — 헤더 메가메뉴의 동명 nav 링크(<a>)와 충돌 방지
    const first = DEPARTMENTS[0];
    const heading = screen.getByRole("heading", { name: first.name, level: 3 });
    expect(heading.closest("a")?.getAttribute("href")).toBe(`/departments/${first.slug}`);
  });
});
