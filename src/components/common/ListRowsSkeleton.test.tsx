import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ListRowsSkeleton } from "./ListRowsSkeleton";

describe("ListRowsSkeleton", () => {
  it("rows 수만큼 행을 aria-hidden으로 렌더한다", () => {
    const { container } = render(<ListRowsSkeleton rows={4} />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.children.length).toBe(4);
  });

  it("기본 10행을 렌더한다", () => {
    const { container } = render(<ListRowsSkeleton />);
    expect((container.firstChild as HTMLElement).children.length).toBe(10);
  });
});
