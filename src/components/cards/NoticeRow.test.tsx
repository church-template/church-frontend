import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { NoticeRow } from "./NoticeRow";

describe("NoticeRow", () => {
  it("isPinned면 '고정' 배지를 표시한다", () => {
    render(<NoticeRow title="수련회 안내" date="2026. 6. 2." href="/notices/2" isPinned />);
    expect(screen.getByText("고정")).toBeDefined();
    expect(screen.getByText("수련회 안내").closest("a")?.getAttribute("href")).toBe(
      "/notices/2",
    );
  });

  it("기본은 배지 없이 제목·날짜만", () => {
    render(<NoticeRow title="일반 공지" date="2026. 6. 3." href="/notices/3" />);
    expect(screen.queryByText("고정")).toBeNull();
    expect(screen.queryByText("NEW")).toBeNull();
  });

  it("isPinned와 isNew가 동시면 고정 배지가 앞에 온다", () => {
    render(<NoticeRow title="t" date="d" href="/notices/4" isPinned isNew />);
    const badges = screen.getAllByText(/고정|NEW/);
    expect(badges.map((b) => b.textContent)).toEqual(["고정", "NEW"]);
  });
});
