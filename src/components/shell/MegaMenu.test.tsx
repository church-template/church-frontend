import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { NAV_PRIMARY } from "@/constants/navigation";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { MegaMenu } from "./MegaMenu";

describe("MegaMenu", () => {
  it("열림: 4컬럼(1뎁스 라벨)과 모든 하위 링크·아이콘 플레이트를 렌더한다", () => {
    const { container } = render(<MegaMenu open onNavigate={() => {}} />);
    for (const item of NAV_PRIMARY) {
      expect(screen.getByText(item.label)).toBeDefined();
      for (const c of item.children) {
        expect(screen.getByText(c.label)).toBeDefined();
      }
    }
    const totalLinks = NAV_PRIMARY.reduce((n, i) => n + i.children.length, 0);
    expect(container.querySelectorAll("svg").length).toBe(totalLinks);
    expect(screen.getByTestId("mega-menu").getAttribute("aria-hidden")).toBe("false");
  });

  it("닫힘: aria-hidden + 모든 링크 tabIndex -1(포커스 차단)", () => {
    const { container } = render(<MegaMenu open={false} onNavigate={() => {}} />);
    expect(screen.getByTestId("mega-menu").getAttribute("aria-hidden")).toBe("true");
    container.querySelectorAll("a").forEach((a) => {
      expect(a.getAttribute("tabindex")).toBe("-1");
    });
  });

  it("링크 클릭 시 onNavigate를 호출한다(패널 닫기)", () => {
    const onNavigate = vi.fn();
    render(<MegaMenu open onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText("설교"));
    expect(onNavigate).toHaveBeenCalled();
  });
});
