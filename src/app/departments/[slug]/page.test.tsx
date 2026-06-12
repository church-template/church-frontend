import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { DEPARTMENTS } from "@/constants/departments";

vi.mock("next/navigation", () => ({
  usePathname: () => "/departments/student",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
// 히어로는 스크롤 연출 분리 — 페이지 합성만 검증. 스크롤 동작은 DeptHero 단위 테스트가 커버.
vi.mock("@/hero/DeptHero", () => ({
  default: ({ title, caption }: { title: string; caption: ReactNode }) => (
    <div data-testid="hero"><h1>{title}</h1><div>{caption}</div></div>
  ),
}));

import DepartmentDetailPage, { generateStaticParams } from "./page";

function stubBrowserApis() {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} })));
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
}
afterEach(() => vi.unstubAllGlobals());

const student = DEPARTMENTS.find((d) => d.slug === "student")!;

describe("DepartmentDetailPage (상세)", () => {
  it("제목·인도자·본문·하위부서를 합성한다", async () => {
    stubBrowserApis();
    const { container } = render(
      await DepartmentDetailPage({ params: Promise.resolve({ slug: "student" }) }),
    );
    expect(screen.getByRole("heading", { name: student.name })).toBeDefined(); // 히어로 h1
    expect(screen.getByText(`인도 · ${student.leader}`)).toBeDefined();
    expect(container.querySelector(".prose-church")?.textContent).toContain("말씀");
    // 하위부서(중등부/고등부) 카드가 상세로 링크된다 — 카드 이름은 h3(헤더 nav와 충돌 방지)
    const child = student.children![0];
    const childHeading = screen.getByRole("heading", { name: child.name, level: 3 });
    expect(childHeading.closest("a")?.getAttribute("href")).toBe(`/departments/${child.slug}`);
  });

  it("없는 slug면 notFound()", async () => {
    stubBrowserApis();
    await expect(
      DepartmentDetailPage({ params: Promise.resolve({ slug: "nope" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("generateStaticParams가 모든 부서 slug(하위 포함)를 반환한다", () => {
    const params = generateStaticParams();
    expect(params).toContainEqual({ slug: "student" });
    expect(params).toContainEqual({ slug: "middle" });
    expect(params).toContainEqual({ slug: "youth" });
  });
});
