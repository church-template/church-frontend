import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { CHURCH_NAME } from "@/constants/church";
import { useAuthStore } from "@/lib/auth/authStore";
import type { MemberSummary } from "@/lib/auth/types";

vi.mock("next/navigation", () => ({ usePathname: () => "/about/history" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { SiteHeader } from "./SiteHeader";

afterEach(() => {
  // 테스트 오염 방지 — 각 케이스가 끝나면 auth 상태 초기화
  useAuthStore.setState({ member: null });
});

describe("SiteHeader", () => {
  it("로고(/)·메뉴·인증·햄버거를 렌더한다", () => {
    render(<SiteHeader />);
    const logo = screen.getByRole("link", { name: CHURCH_NAME }) as HTMLAnchorElement;
    expect(logo.getAttribute("href")).toBe("/");
    // MegaMenu도 같은 라벨을 렌더하므로 getAllByText로 존재 확인
    expect(screen.getAllByText("예배·설교").length).toBeGreaterThan(0); // 새 IA 라벨
    expect(screen.getAllByText("교회안내").length).toBeGreaterThan(0); // 새 IA 라벨
    expect(screen.getByRole("button", { name: "메뉴 열기" })).toBeDefined();
  });

  it("현재 경로(/about/history)의 상위 메뉴(교회안내)를 활성 표시한다", () => {
    render(<SiteHeader />);
    // 주 메뉴 nav 안의 링크만 조회(MegaMenu 컬럼 헤더와 중복 방지)
    const nav = screen.getByRole("navigation", { name: "주 메뉴" });
    const trigger = nav.querySelector("a[href='/about']") as HTMLAnchorElement;
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

  it("nav mouseEnter → 메가메뉴 aria-hidden=false(열림)", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "주 메뉴" });
    fireEvent.mouseEnter(nav);
    expect(screen.getByTestId("mega-menu").getAttribute("aria-hidden")).toBe("false");
  });

  it("Escape keydown → 메가메뉴 닫힘(aria-hidden=true)", () => {
    const { container } = render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "주 메뉴" });
    fireEvent.mouseEnter(nav);
    expect(screen.getByTestId("mega-menu").getAttribute("aria-hidden")).toBe("false");
    const header = container.querySelector("header") as HTMLElement;
    fireEvent.keyDown(header, { key: "Escape" });
    expect(screen.getByTestId("mega-menu").getAttribute("aria-hidden")).toBe("true");
  });

  it("header mouseLeave → 메가메뉴 닫힘(aria-hidden=true)", () => {
    const { container } = render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "주 메뉴" });
    fireEvent.mouseEnter(nav);
    expect(screen.getByTestId("mega-menu").getAttribute("aria-hidden")).toBe("false");
    fireEvent.mouseLeave(container.querySelector("header") as HTMLElement);
    expect(screen.getByTestId("mega-menu").getAttribute("aria-hidden")).toBe("true");
  });

  it("포커스가 헤더 밖으로 이탈 → 메가메뉴 닫힘(WCAG 1.4.13)", () => {
    const { container } = render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "주 메뉴" });
    fireEvent.mouseEnter(nav);
    expect(screen.getByTestId("mega-menu").getAttribute("aria-hidden")).toBe("false");
    // relatedTarget이 헤더 밖(여기선 null) → 닫힘
    fireEvent.blur(container.querySelector("header") as HTMLElement);
    expect(screen.getByTestId("mega-menu").getAttribute("aria-hidden")).toBe("true");
  });

  it("기본(member null) → 로그인 링크만 존재, 마이페이지 없음", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "로그인" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "마이페이지" })).toBeNull();
  });

  it("member 존재 → 마이페이지 링크만 존재, 로그인 없음", () => {
    useAuthStore.setState({
      member: { uuid: "u1", name: "홍길동", phone: "", position: "", roles: [] } satisfies MemberSummary,
    });
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "마이페이지" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "로그인" })).toBeNull();
  });
});

describe("SiteHeader solid (T8)", () => {
  it("transparent + solid면 fixed를 유지한 채 라이트 스킨으로 전환한다", () => {
    render(<SiteHeader variant="transparent" solid />);
    const header = screen.getByRole("banner");
    expect(header.className).toContain("fixed");
    expect(header.className).toContain("bg-canvas");
    expect(header.className).not.toContain("text-on-dark");
  });

  it("transparent 기본은 투명 + on-dark 그대로다(회귀)", () => {
    render(<SiteHeader variant="transparent" />);
    const header = screen.getByRole("banner");
    expect(header.className).toContain("bg-transparent");
    expect(header.className).toContain("text-on-dark");
  });

  it("solid는 light variant에 영향이 없다", () => {
    render(<SiteHeader solid />);
    expect(screen.getByRole("banner").className).not.toContain("fixed");
  });

  it("transparent에서 nav mouseEnter 시 헤더가 bg-canvas(라이트 스킨)", () => {
    render(<SiteHeader variant="transparent" />);
    const header = screen.getByRole("banner");
    // 메가메뉴 열리기 전: on-dark
    expect(header.className).toContain("bg-transparent");
    const nav = screen.getByRole("navigation", { name: "주 메뉴" });
    fireEvent.mouseEnter(nav);
    expect(header.className).toContain("bg-canvas");
    expect(header.className).not.toContain("bg-transparent");
  });
});
