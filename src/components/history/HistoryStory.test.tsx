import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HISTORY } from "@/constants/content";
import { HistoryStory } from "./HistoryStory";

afterEach(() => vi.unstubAllGlobals());

describe("HistoryStory", () => {
  it("제목 '연혁'을 h1로, intro와 모든 시대 카드를 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true }))); // Reveal reduced 경로
    const { container } = render(<HistoryStory content={HISTORY} />);
    expect(container.querySelector("h1")?.textContent).toBe(HISTORY.title); // "연혁"
    expect(screen.getByText(HISTORY.intro)).toBeDefined();
    for (const item of HISTORY.items) {
      // 활성 시대 제목은 좌측 aside에는 없고(사진만) 우측 카드에서 1개 이상 확인.
      expect(screen.getAllByText(item.text).length).toBeGreaterThan(0);
    }
  });

  it("폐기된 고정 히어로(풀스크린 오버레이)를 렌더하지 않는다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(<HistoryStory content={HISTORY} />);
    // HistoryHero 오버레이 마커(#history-hero-title) 부재 = 히어로 제거 검증.
    expect(container.querySelector("#history-hero-title")).toBeNull();
  });

  it("좌측 aside는 활성 시대 사진만 렌더한다(라벨·연도 없음)", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(<HistoryStory content={HISTORY} />);
    const aside = container.querySelector("aside");
    expect(aside).not.toBeNull();
    expect(aside?.querySelector("img")).not.toBeNull(); // 사진
    expect((aside?.textContent ?? "").trim()).toBe(""); // 텍스트 없음
  });
});
