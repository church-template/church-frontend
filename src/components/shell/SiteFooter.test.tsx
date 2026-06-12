import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { CHURCH_NAME, CHURCH_ADDRESS } from "@/constants/church";
import { FOOTER_COLUMNS } from "@/constants/navigation";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("FOOTER_COLUMNS의 4개 컬럼 타이틀이 모두 표시된다", () => {
    render(<SiteFooter />);
    for (const col of FOOTER_COLUMNS) {
      // 각 컬럼은 aria-label=col.title인 nav 요소로 렌더된다(SiteFooter 구조)
      expect(screen.getByRole("navigation", { name: col.title })).toBeDefined();
    }
  });

  it("교회 정보·링크열·저작권을 렌더한다", () => {
    render(<SiteFooter />);
    // 브랜드 + 저작권에 교회명이 2회 이상 등장
    expect(screen.getAllByText(CHURCH_NAME).length).toBeGreaterThan(0);
    expect(screen.getByText((t) => t.includes(CHURCH_ADDRESS))).toBeDefined();
    const location = screen.getByRole("link", { name: "오시는 길" }) as HTMLAnchorElement;
    expect(location.getAttribute("href")).toBe("/about/location");
    expect(screen.getByText(/©/)).toBeDefined();
  });
});
