import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/sermons",
  useSearchParams: () => new URLSearchParams("tagId=3"),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { TagFilterPills } from "./TagFilter";

const tags = [
  { id: 3, name: "주일예배" },
  { id: 5, name: "수요예배" },
];

describe("TagFilterPills", () => {
  it("'전체'는 tagId를 제거한 href", () => {
    render(<TagFilterPills tags={tags} />);
    const all = screen.getByRole("link", { name: "전체" }) as HTMLAnchorElement;
    expect(all.getAttribute("href")).toBe("/sermons");
  });

  it("태그 선택 시 ?tagId= 단수로 재조회(page 리셋)", () => {
    render(<TagFilterPills tags={tags} />);
    const t = screen.getByRole("link", { name: "수요예배" }) as HTMLAnchorElement;
    expect(t.getAttribute("href")).toBe("/sermons?tagId=5");
  });

  it("현재 tagId(3)인 필은 aria-pressed", () => {
    render(<TagFilterPills tags={tags} />);
    const active = screen.getByRole("link", { name: "주일예배" });
    expect(active.getAttribute("aria-pressed")).toBe("true");
  });
});
