import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { CHURCH_NAME } from "@/constants/church";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import Home from "./page";

describe("Home (임시)", () => {
  it("셸과 함께 임시 홈 안내를 렌더한다", () => {
    render(<Home />);
    expect(screen.getAllByText(CHURCH_NAME).length).toBeGreaterThan(0);
    expect(screen.getByText("홈 페이지는 T08에서 구성됩니다.")).toBeDefined();
  });
});
