import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CardGridSkeleton } from "./CardGridSkeleton";

describe("CardGridSkeleton", () => {
  it("count 수만큼 카드꼴을 반응형 그리드로 aria-hidden 렌더한다", () => {
    const { container } = render(<CardGridSkeleton count={3} />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.className).toContain("sm:grid-cols-2");
    expect(root.className).toContain("lg:grid-cols-3");
    expect(root.children.length).toBe(3);
  });

  it("기본 6개를 렌더한다", () => {
    const { container } = render(<CardGridSkeleton />);
    expect((container.firstChild as HTMLElement).children.length).toBe(6);
  });
});
