import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { CHURCH_NAME } from "@/constants/church";

vi.mock("next/navigation", () => ({ usePathname: () => "/about/history" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  it("로고(/)·메뉴·인증·햄버거를 렌더한다", () => {
    render(<SiteHeader />);
    const logo = screen.getByRole("link", { name: CHURCH_NAME }) as HTMLAnchorElement;
    expect(logo.getAttribute("href")).toBe("/");
    expect(screen.getByText("예배")).toBeDefined(); // 단일 링크
    expect(screen.getByText("교회소개")).toBeDefined(); // 드롭다운 트리거
    expect(screen.getByRole("button", { name: "메뉴 열기" })).toBeDefined();
  });

  it("현재 경로(/about/history)의 상위 메뉴(교회소개)를 활성 표시한다", () => {
    render(<SiteHeader />);
    const trigger = screen.getByText("교회소개");
    expect(trigger.className).toContain("underline");
  });

  it("transparent variant는 fixed + z-nav", () => {
    const { container } = render(<SiteHeader variant="transparent" />);
    const header = container.querySelector("header") as HTMLElement;
    expect(header.className).toContain("fixed");
    expect(header.className).toContain("z-nav");
  });

  it("light variant는 fixed가 아니다", () => {
    const { container } = render(<SiteHeader />);
    const header = container.querySelector("header") as HTMLElement;
    expect(header.className).not.toContain("fixed");
  });

  it("햄버거 버튼은 aria-expanded로 열림 상태를 노출한다", () => {
    render(<SiteHeader />);
    const button = screen.getByRole("button", { name: "메뉴 열기" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });
});
