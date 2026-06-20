import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { useAuthStore } from "@/lib/auth/authStore";
import type { MemberSummary } from "@/lib/auth/types";

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

afterEach(() => {
  // 테스트 오염 방지
  useAuthStore.setState({ member: null });
});

describe("MobileNav", () => {
  it("열리면 그룹 구조(1뎁스 라벨 링크 + 하위 링크)를 렌더한다", () => {
    render(<MobileNav open onOpenChange={() => {}} />);
    // 1뎁스 라벨(링크)
    expect(screen.getByRole("link", { name: "예배·설교" })).toBeDefined();
    // 하위 자식 링크
    expect(screen.getByText("공지")).toBeDefined(); // 소식 하위
    expect(screen.getByText("연락처 및 위치")).toBeDefined(); // 교회안내 하위
    expect(screen.getByText("설교")).toBeDefined(); // 예배·설교 하위
  });

  it("기본(member null)이면 로그인 단일 링크를 노출한다", () => {
    render(<MobileNav open onOpenChange={() => {}} />);
    expect(screen.getByRole("link", { name: "로그인" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "마이페이지" })).toBeNull();
  });

  it("member 존재 시 마이페이지 단일 링크를 노출한다", () => {
    useAuthStore.setState({
      member: { uuid: "u1", name: "홍길동", phone: "", position: "", roles: [] } satisfies MemberSummary,
    });
    render(<MobileNav open onOpenChange={() => {}} />);
    expect(screen.getByRole("link", { name: "마이페이지" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "로그인" })).toBeNull();
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
