import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { CHURCH_NAME, CHURCH_ADDRESS } from "@/constants/church";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
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
