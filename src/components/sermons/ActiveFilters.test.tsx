// src/components/sermons/ActiveFilters.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/sermons",
  useSearchParams: () => new URLSearchParams("q=grace&preacher=Kim&tagId=3"),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { buildChips, ActiveFilterChips } from "./ActiveFilters";

describe("buildChips (순수)", () => {
  it("필터 없으면 빈 배열", () => {
    expect(buildChips(new URLSearchParams(""))).toEqual([]);
    expect(buildChips(new URLSearchParams("tagId=3&page=2"))).toEqual([]); // tagId·page는 칩 제외
  });
  it("q·preacher·series·기간 칩 생성", () => {
    const chips = buildChips(new URLSearchParams("q=은혜&preacher=Kim&series=여름&from=2026-01-01"));
    expect(chips.map((c) => c.label)).toEqual([
      '검색: "은혜"',
      "설교자: Kim",
      "시리즈: 여름",
      "기간: 2026-01-01 ~ 끝",
    ]);
  });
  it("to만 있으면 '처음 ~' 라벨", () => {
    const chips = buildChips(new URLSearchParams("to=2026-12-31"));
    expect(chips.map((c) => c.label)).toEqual(["기간: 처음 ~ 2026-12-31"]);
  });
});

describe("ActiveFilterChips (렌더)", () => {
  it("칩 ✕는 해당 param+page만 제거(나머지 보존)", () => {
    render(<ActiveFilterChips />);
    const remove = screen.getByLabelText('검색: "grace" 필터 제거') as HTMLAnchorElement;
    const href = remove.getAttribute("href")!;
    expect(href).not.toContain("q=");
    expect(href).toContain("preacher=Kim");
    expect(href).toContain("tagId=3");
  });
});
