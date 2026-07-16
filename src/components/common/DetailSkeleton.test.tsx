import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DetailSkeleton } from "./DetailSkeleton";

describe("DetailSkeleton", () => {
  it("제목·메타·본문 자리표시를 aria-hidden으로 렌더한다", () => {
    const { container } = render(<DetailSkeleton />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(3);
  });
});
