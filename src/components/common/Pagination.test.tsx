import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// next/navigation·next/link 모킹: 현재 경로/쿼리 고정, Link는 a로 단순화.
vi.mock("next/navigation", () => ({
  usePathname: () => "/sermons",
  useSearchParams: () => new URLSearchParams("tagId=3"),
}));
vi.mock("next/link", () => ({
  // scroll은 유효한 DOM 속성이 아니므로 data-scroll로 노출해 전달 여부를 검증한다.
  default: ({
    href,
    children,
    scroll,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    scroll?: boolean;
  }) => (
    <a href={href} data-scroll={scroll === undefined ? undefined : String(scroll)} {...rest}>
      {children}
    </a>
  ),
}));

import { pageItems, PaginationControls } from "./Pagination";

describe("pageItems", () => {
  it("7개 이하면 전부 노출", () => {
    expect(pageItems(0, 5)).toEqual([0, 1, 2, 3, 4]);
  });
  it("7개 초과면 말줄임 포함", () => {
    expect(pageItems(5, 10)).toEqual([0, "ellipsis", 4, 5, 6, "ellipsis", 9]);
  });
});

describe("PaginationControls", () => {
  const page = { size: 10, number: 1, totalElements: 95, totalPages: 10 };

  it("page 링크가 기존 쿼리(tagId)를 보존하고 0-base로 교체", () => {
    render(<PaginationControls page={page} />);
    // 표시 '3' = number 2 (0-base). 기존 tagId=3 유지.
    const link = screen.getByRole("link", { name: "3" }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/sermons?tagId=3&page=2");
  });

  it("현재 페이지(number=1, 표시 2)는 aria-current", () => {
    render(<PaginationControls page={page} />);
    const current = screen.getByText("2");
    expect(current.getAttribute("aria-current")).toBe("page");
  });

  it("첫 페이지에서 '이전'은 비활성(링크 아님)", () => {
    render(<PaginationControls page={{ ...page, number: 0 }} />);
    const prev = screen.getByTestId("pagination-prev");
    expect(prev.getAttribute("aria-disabled")).toBe("true");
  });
});

describe("PaginationControls scroll prop", () => {
  const page = { size: 10, number: 1, totalElements: 95, totalPages: 10 };

  it("scroll={false}면 숫자 링크에 scroll 전달(목록 스크롤 점프 방지)", () => {
    render(<PaginationControls page={page} scroll={false} />);
    const link = screen.getByRole("link", { name: "3" });
    expect(link.getAttribute("data-scroll")).toBe("false");
  });

  it("scroll={false}면 다음 화살표 링크에도 전달", () => {
    render(<PaginationControls page={page} scroll={false} />);
    const next = screen.getByTestId("pagination-next");
    expect(next.getAttribute("data-scroll")).toBe("false");
  });

  it("기본값은 scroll 유지(true) — 공개 ISR 페이지 동작 보존", () => {
    render(<PaginationControls page={page} />);
    const link = screen.getByRole("link", { name: "3" });
    expect(link.getAttribute("data-scroll")).toBe("true");
  });
});
