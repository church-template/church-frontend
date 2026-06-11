import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("펄스 애니메이션 박스를 렌더한다", () => {
    const { container } = render(<Skeleton className="h-10 w-full" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("animate-pulse");
    expect(el.className).toContain("h-10");
  });
});
