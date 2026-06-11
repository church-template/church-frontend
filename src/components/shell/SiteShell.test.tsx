import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { CHURCH_NAME } from "@/constants/church";

vi.mock("next/navigation", () => ({ usePathname: () => "/about" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { SiteShell } from "./SiteShell";

describe("SiteShell", () => {
  it("헤더·본문·CTA밴드·푸터를 합성한다", () => {
    render(
      <SiteShell>
        <p>본문</p>
      </SiteShell>,
    );
    expect(screen.getByText("본문")).toBeDefined();
    expect(screen.getByText("처음 오셨나요?")).toBeDefined(); // CTA밴드
    expect(screen.getAllByText(CHURCH_NAME).length).toBeGreaterThan(0); // 헤더+푸터
  });

  it("showCtaBand=false면 CTA밴드를 숨긴다", () => {
    render(
      <SiteShell showCtaBand={false}>
        <p>x</p>
      </SiteShell>,
    );
    expect(screen.queryByText("처음 오셨나요?")).toBeNull();
  });
});
