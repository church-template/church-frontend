import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { WORSHIP } from "@/constants/content";
import { CHURCH_ADDRESS, CHURCH_PHONE } from "@/constants/church";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { WorshipPlace } from "./WorshipPlace";

describe("WorshipPlace", () => {
  it("장소·문의·참석 안내와 오시는 길 링크를 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<WorshipPlace />);

    expect(
      screen.getByRole("heading", { level: 2, name: WORSHIP.placeHeading }),
    ).toBeDefined();
    expect(screen.getByText(CHURCH_ADDRESS)).toBeDefined();

    const tel = screen.getByRole("link", { name: CHURCH_PHONE });
    expect(tel.getAttribute("href")).toBe(`tel:${CHURCH_PHONE}`);

    const more = screen.getByRole("link", { name: "오시는 길 자세히" });
    expect(more.getAttribute("href")).toBe("/about/location");

    expect(screen.getByText(WORSHIP.attendHeading)).toBeDefined();
    expect(screen.getByText(WORSHIP.attendNotes[0])).toBeDefined();
  });
});
