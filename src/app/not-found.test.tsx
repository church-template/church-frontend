import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({ usePathname: () => "/없는경로" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import NotFound from "./not-found";

describe("NotFound", () => {
  it("404 문구와 홈복귀 링크를 셸 위에 렌더하고 CTA밴드는 없다", () => {
    render(<NotFound />);
    expect(screen.getByText("페이지를 찾을 수 없습니다")).toBeDefined();
    const home = screen.getByRole("link", { name: "홈으로" }) as HTMLAnchorElement;
    expect(home.getAttribute("href")).toBe("/");
    expect(screen.queryByText("처음 오셨나요?")).toBeNull();
  });
});
