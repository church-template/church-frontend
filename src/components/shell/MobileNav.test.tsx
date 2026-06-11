import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

// usePathname을 가변 변수로 모킹 → 라우트 변경(rerender)으로 effect 동작 검증.
let mockPath = "/";
vi.mock("next/navigation", () => ({ usePathname: () => mockPath }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { MobileNav } from "./MobileNav";

beforeEach(() => {
  mockPath = "/";
});

describe("MobileNav", () => {
  it("열리면 IA 트리와 인증 링크를 노출한다", () => {
    render(<MobileNav open onOpenChange={() => {}} />);
    expect(screen.getByText("공지")).toBeDefined(); // 소식 하위
    expect(screen.getByText("오시는 길")).toBeDefined(); // 교회소개 하위
    expect(screen.getByRole("link", { name: "로그인" })).toBeDefined();
  });

  it("닫혀 있으면 콘텐츠를 렌더하지 않는다", () => {
    render(<MobileNav open={false} onOpenChange={() => {}} />);
    expect(screen.queryByText("공지")).toBeNull();
  });

  it("링크 클릭(SheetClose) 시 onOpenChange(false)", () => {
    const spy = vi.fn();
    render(<MobileNav open onOpenChange={spy} />);
    fireEvent.click(screen.getByRole("link", { name: "설교" }));
    expect(spy).toHaveBeenCalledWith(false);
  });

  it("라우트가 바뀌면 닫힌다(onOpenChange(false))", () => {
    const spy = vi.fn();
    const { rerender } = render(<MobileNav open onOpenChange={spy} />);
    mockPath = "/sermons";
    rerender(<MobileNav open onOpenChange={spy} />);
    expect(spy).toHaveBeenCalledWith(false);
  });
});
