import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { CTA_BAND } from "@/constants/content";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { CtaBand } from "./CtaBand";

describe("CtaBand", () => {
  it("헤드라인과 CTA 2개(새가족 안내·오시는 길)를 렌더한다", () => {
    render(<CtaBand />);
    expect(screen.getByText(CTA_BAND.heading)).toBeDefined();
    const primary = screen.getByRole("link", { name: CTA_BAND.primary }) as HTMLAnchorElement;
    const secondary = screen.getByRole("link", { name: CTA_BAND.secondary }) as HTMLAnchorElement;
    expect(primary.getAttribute("href")).toBe("/about");
    expect(secondary.getAttribute("href")).toBe("/about/location");
  });

  it("CTA 2개는 동일한 크기(56px 필)다", () => {
    render(<CtaBand />);
    const primary = screen.getByRole("link", { name: CTA_BAND.primary });
    const secondary = screen.getByRole("link", { name: CTA_BAND.secondary });
    // DESIGN.md pill-cta: CTA 밴드 버튼은 둘 다 56px 대형 필(h-14 px-8)
    expect(primary.className).toContain("h-14");
    expect(secondary.className).toContain("h-14");
    expect(secondary.className).not.toContain("h-11");
  });
});
