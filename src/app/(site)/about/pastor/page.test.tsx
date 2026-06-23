import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PASTOR } from "@/constants/content";
import PastorPage from "./page";

afterEach(() => vi.unstubAllGlobals());

describe("PastorPage", () => {
  it("인사말 헤더·인용·약력·철학을 모두 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<PastorPage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toContain(PASTOR.name);
    expect(h1.textContent).toContain(PASTOR.position);
    expect(screen.getByText(PASTOR.intro)).toBeDefined();
    expect(screen.getByText(PASTOR.greeting[0])).toBeDefined();
    expect(screen.getByText(PASTOR.pullQuote)).toBeDefined();
    expect(screen.getByText(PASTOR.credentials.heading)).toBeDefined();
    expect(screen.getByText(PASTOR.credentials.items[0])).toBeDefined();
    expect(screen.getByText(PASTOR.philosophy.heading)).toBeDefined();
    expect(screen.getByText(PASTOR.philosophy.items[0].text)).toBeDefined();
  });
});
