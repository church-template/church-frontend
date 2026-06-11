import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Container } from "./Container";

describe("Container", () => {
  it("토큰 컨테이너 클래스와 자식을 렌더한다", () => {
    const { container, getByText } = render(<Container>안녕</Container>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("max-w-[var(--container-max)]");
    expect(el.className).toContain("px-[var(--container-padding)]");
    expect(getByText("안녕")).toBeDefined();
  });

  it("as prop으로 태그를 바꾸고 className을 병합한다", () => {
    const { container } = render(
      <Container as="section" className="py-section">
        x
      </Container>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe("SECTION");
    expect(el.className).toContain("py-section");
  });
});
