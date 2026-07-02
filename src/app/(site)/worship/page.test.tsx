import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { WORSHIP } from "@/constants/content";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import WorshipPage from "./page";

describe("WorshipPage", () => {
  it("정기·특별·장소 세 섹션을 조립해 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<WorshipPage />);

    expect(screen.getByRole("heading", { level: 1, name: WORSHIP.title })).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 2, name: WORSHIP.specialHeading }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 2, name: WORSHIP.placeHeading }),
    ).toBeDefined();
  });
});
