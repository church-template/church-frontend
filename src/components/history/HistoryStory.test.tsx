import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HISTORY } from "@/constants/content";
import { HistoryStory } from "./HistoryStory";
import styles from "./HistoryStory.module.css";

afterEach(() => vi.unstubAllGlobals());

const reduced = () => vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));

describe("HistoryStory (에디토리얼 챕터 그리드)", () => {
  it("제목 h1·intro와 모든 시대 챕터를 렌더한다", () => {
    reduced();
    const { container } = render(<HistoryStory content={HISTORY} />);
    expect(container.querySelector("h1")?.textContent).toBe(HISTORY.title);
    expect(screen.getByText(HISTORY.intro)).toBeDefined();
    expect(container.querySelectorAll("ol > li").length).toBe(HISTORY.items.length);
    for (const item of HISTORY.items) {
      expect(screen.getAllByText(item.text).length).toBeGreaterThan(0);
    }
  });

  it("좌측 sticky aside를 렌더하지 않는다(그리드 전면 개편)", () => {
    reduced();
    const { container } = render(<HistoryStory content={HISTORY} />);
    expect(container.querySelector("aside")).toBeNull();
  });

  it("마지막 챕터만 다크 변형이다", () => {
    reduced();
    const { container } = render(<HistoryStory content={HISTORY} />);
    expect(container.querySelectorAll(`.${styles.dark}`).length).toBe(1);
    const chapters = container.querySelectorAll(`.${styles.chapter}`);
    expect(chapters.length).toBe(HISTORY.items.length);
    expect(chapters[chapters.length - 1].classList.contains(styles.dark)).toBe(true);
  });
});
