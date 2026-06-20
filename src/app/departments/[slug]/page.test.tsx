import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { DEPARTMENTS, DEPT_PAGE } from "@/constants/departments";

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
  it("제목·본문을 합성한다(상수 구동)", async () => {
    stubBrowserApis();
    const { container } = render(
      await DepartmentDetailPage({ params: Promise.resolve({ slug: "student" }) }),
    );
    expect(screen.getByRole("heading", { name: student.name })).toBeDefined(); // 히어로 h1
    expect(container.querySelector(".prose-church")?.textContent).toContain("말씀");
    // 실제 교회는 담당자·하위부서가 없어 해당 영역(인도 줄·하위부서 섹션)은 노출되지 않는다
    expect(screen.queryByText(/인도 ·/)).toBeNull();
    expect(screen.queryByRole("heading", { name: DEPT_PAGE.subHeading })).toBeNull();
  });

  it("없는 slug면 notFound()", async () => {
    stubBrowserApis();
    await expect(
      DepartmentDetailPage({ params: Promise.resolve({ slug: "nope" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("generateStaticParams가 모든 부서 slug를 반환한다", () => {
    const params = generateStaticParams();
    expect(params).toContainEqual({ slug: "student" });
    expect(params).toContainEqual({ slug: "youth" });
    expect(params).toContainEqual({ slug: "women" });
  });
});
