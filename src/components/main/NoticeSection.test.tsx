import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MAIN_SECTIONS } from "@/constants/content";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { NoticeSection } from "./NoticeSection";

const notice = {
  id: 2,
  title: "전교인 수련회 안내",
  isPinned: true,
  viewCount: 10,
  createdAt: "2026-06-02T09:00:00",
  tags: [],
};

describe("NoticeSection", () => {
  it("행 매핑 — 제목·날짜 포맷·고정 배지·상세 링크", () => {
    render(<NoticeSection notices={[notice]} />);
    expect(screen.getByText(MAIN_SECTIONS.notices.title)).toBeDefined();
    expect(screen.getByText("2026. 6. 2.")).toBeDefined();
    expect(screen.getByText("고정")).toBeDefined();
    expect(screen.getByText("전교인 수련회 안내").closest("a")?.getAttribute("href")).toBe(
      "/notices/2",
    );
  });

  it("빈 배열이면 섹션 유지 + EmptyState", () => {
    render(<NoticeSection notices={[]} />);
    expect(screen.getByText(MAIN_SECTIONS.notices.empty)).toBeDefined();
  });
});
