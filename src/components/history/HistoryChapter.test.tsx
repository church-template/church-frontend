import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HISTORY } from "@/constants/content";
import { HistoryChapter } from "./HistoryChapter";
import styles from "./HistoryStory.module.css";

afterEach(() => vi.unstubAllGlobals());

// Reveal reduced 경로 — IO 미등록으로 즉시 표시
const reduced = () => vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));

describe("HistoryChapter (챕터 그리드)", () => {
  const item = HISTORY.items[0];

  it("연도·제목·설명·세부·의의를 렌더한다", () => {
    reduced();
    render(
      <ol>
        <HistoryChapter item={item} index={0} />
      </ol>,
    );
    expect(screen.getByText(item.year)).toBeDefined();
    expect(screen.getByText(item.text)).toBeDefined();
    expect(screen.getByText(item.desc)).toBeDefined();
    expect(screen.getByText(item.significance)).toBeDefined();
    for (const d of item.details) expect(screen.getByText(d)).toBeDefined();
  });

  it("챕터 번호를 2자리 장식(aria-hidden)으로 렌더한다", () => {
    reduced();
    render(
      <ol>
        <HistoryChapter item={item} index={0} />
      </ol>,
    );
    expect(screen.getByText("01").getAttribute("aria-hidden")).toBe("true");
  });

  it("홀수 index는 미러, dark는 다크 변형 클래스를 얻는다", () => {
    reduced();
    const { container } = render(
      <ol>
        <HistoryChapter item={HISTORY.items[0]} index={0} />
        <HistoryChapter item={HISTORY.items[1]} index={1} />
        <HistoryChapter item={HISTORY.items[2]} index={2} dark />
      </ol>,
    );
    const chapters = container.querySelectorAll(`.${styles.chapter}`);
    expect(chapters.length).toBe(3);
    expect(chapters[0].classList.contains(styles.mirrored)).toBe(false);
    expect(chapters[1].classList.contains(styles.mirrored)).toBe(true);
    expect(chapters[0].classList.contains(styles.dark)).toBe(false);
    expect(chapters[2].classList.contains(styles.dark)).toBe(true);
  });

  it("사진을 alt=''로 렌더하고 헤딩 aria-labelledby를 연결한다", () => {
    reduced();
    const { container } = render(
      <ol>
        <HistoryChapter item={item} index={0} />
      </ol>,
    );
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
    const li = container.querySelector("li[id]");
    expect(li?.getAttribute("aria-labelledby")).toBe(`${item.id}-h`);
    expect(container.querySelector(`[id="${item.id}-h"]`)).not.toBeNull();
  });
});
