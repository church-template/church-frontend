import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PASTOR } from "@/constants/content";
import PastorPage from "./page";

afterEach(() => vi.unstubAllGlobals());

describe("PastorPage", () => {
  it("인사말 헤더·인용·약력·철학을 모두 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(<PastorPage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toContain(PASTOR.name);
    expect(h1.textContent).toContain(PASTOR.position);
    // 본문은 문장 span으로 쪼개 렌더된다(리딩 스포트라이트) — 블록 전체 텍스트로 확인.
    const reading = container.querySelector("[data-reading]")?.textContent?.replace(/\s+/g, " ");
    expect(reading).toContain(PASTOR.intro);
    expect(reading).toContain(PASTOR.greeting[0]);
    expect(screen.getByText(PASTOR.pullQuote)).toBeDefined();
    expect(screen.getByText(PASTOR.credentials.heading)).toBeDefined();
    expect(screen.getByText(PASTOR.credentials.items[0])).toBeDefined();
    expect(screen.getByText(PASTOR.philosophy.heading)).toBeDefined();
    expect(screen.getByText(PASTOR.philosophy.items[0].text)).toBeDefined();
  });
});
