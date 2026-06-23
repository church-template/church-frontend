import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PASTOR } from "@/constants/content";
import { PastorIntro } from "./PastorIntro";

afterEach(() => vi.unstubAllGlobals());

describe("PastorIntro", () => {
  it("키커·이름·직분·학위·intro·greeting을 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<PastorIntro />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toContain(PASTOR.name);
    expect(h1.textContent).toContain(PASTOR.position);
    expect(screen.getByText(PASTOR.degree)).toBeDefined();
    expect(screen.getByText(PASTOR.intro)).toBeDefined();
    expect(screen.getByText(PASTOR.greeting[0])).toBeDefined();
    expect(screen.getByText(PASTOR.greeting[1])).toBeDefined();
  });

  it("자산 미준비 시 초상 폴백(아이콘)을 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(<PastorIntro />);
    // PASTOR.image 기본값 null → img 없이 장식 아이콘
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
