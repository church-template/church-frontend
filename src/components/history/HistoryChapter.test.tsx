import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HISTORY } from "@/constants/content";
import { HistoryChapter } from "./HistoryChapter";

afterEach(() => vi.unstubAllGlobals());

describe("HistoryChapter (시대 카드)", () => {
  const item = HISTORY.items[0];

  it("연도·제목·설명·세부·의의를 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true }))); // Reveal reduced 경로
    render(
      <ul>
        <HistoryChapter item={item} />
      </ul>,
    );
    expect(screen.getByText(item.year)).toBeDefined();
    expect(screen.getByText(item.text)).toBeDefined();
    expect(screen.getByText(item.desc)).toBeDefined();
    expect(screen.getByText(item.significance)).toBeDefined();
    for (const d of item.details) expect(screen.getByText(d)).toBeDefined();
  });

  it("사진을 alt=''로 렌더하고 헤딩 aria-labelledby를 연결한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(
      <ul>
        <HistoryChapter item={item} />
      </ul>,
    );
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
    const li = container.querySelector("li[id]");
    expect(li?.getAttribute("aria-labelledby")).toBe(`${item.id}-h`);
    expect(container.querySelector(`[id="${item.id}-h"]`)).not.toBeNull();
  });
});
