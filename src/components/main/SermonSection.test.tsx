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

import { SermonSection } from "./SermonSection";

const sermon = {
  id: 1,
  title: "부활의 증인",
  preacher: "김목사",
  series: "요한복음 시리즈",
  scripture: "요한복음 20:19-23",
  preachedAt: "2026-06-01",
  viewCount: 3,
  tags: [{ id: 1, name: "부활" }],
};

describe("SermonSection", () => {
  it("카드 매핑 — 제목·날짜 포맷·보조줄·태그·상세 링크", () => {
    render(<SermonSection sermons={[sermon]} />);
    expect(screen.getByText(MAIN_SECTIONS.sermons.title)).toBeDefined();
    expect(screen.getByText("김목사 · 2026. 6. 1.")).toBeDefined();
    expect(screen.getByText("요한복음 시리즈 · 요한복음 20:19-23")).toBeDefined();
    expect(screen.getByText("부활")).toBeDefined();
    expect(screen.getByText("부활의 증인").closest("a")?.getAttribute("href")).toBe(
      "/sermons/1",
    );
  });

  it("빈 배열이면 섹션 유지 + EmptyState", () => {
    render(<SermonSection sermons={[]} />);
    expect(screen.getByText(MAIN_SECTIONS.sermons.title)).toBeDefined();
    expect(screen.getByText(MAIN_SECTIONS.sermons.empty)).toBeDefined();
  });
});
