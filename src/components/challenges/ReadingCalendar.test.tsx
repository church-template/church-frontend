import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReadingCalendar } from "./ReadingCalendar";

// 오늘을 2026-01-27(KST)로 고정 — 활성 범위·오늘 표시 검증.
vi.useFakeTimers();
vi.setSystemTime(new Date("2026-01-27T03:00:00+09:00"));

const props = {
  startDate: "2026-01-05", endDate: "2026-03-10",
  logs: [{ readDate: "2026-01-20", chapters: 5 }, { readDate: "2026-01-26", chapters: 4 }],
  year: 2026, month: 1,
  onMonthChange: vi.fn(), onSelectDay: vi.fn(),
};

describe("ReadingCalendar", () => {
  it("읽은 날 ✓+장 수, 탭하면 onSelectDay(date, existing)", () => {
    render(<ReadingCalendar {...props} />);
    const read = screen.getByRole("button", { name: "1월 20일 · 5장 읽음" });
    fireEvent.click(read);
    expect(props.onSelectDay).toHaveBeenCalledWith("2026-01-20", 5);
  });

  it("빈 날(범위 내) 탭하면 onSelectDay(date, null)", () => {
    render(<ReadingCalendar {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "1월 21일 · 기록 없음" }));
    expect(props.onSelectDay).toHaveBeenCalledWith("2026-01-21", null);
  });

  it("미래·시작 전 날짜는 비활성", () => {
    render(<ReadingCalendar {...props} />);
    expect((screen.getByRole("button", { name: "1월 28일 · 기록 없음" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "1월 4일 · 기록 없음" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("현재 월에서는 다음 달 비활성, 시작월이면 이전 달도 비활성", () => {
    render(<ReadingCalendar {...props} />);
    expect((screen.getByRole("button", { name: "다음 달" }) as HTMLButtonElement).disabled).toBe(true);
    // startDate 2026-01-05 → 시작월 == 현재월(1월)이라 이전 달도 잠김
    expect((screen.getByRole("button", { name: "이전 달" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("시작월이 이전 달이면 이전 달 이동 가능", () => {
    render(<ReadingCalendar {...props} startDate="2025-12-20" />);
    const prevBtn = screen.getByRole("button", { name: "이전 달" }) as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(false);
    fireEvent.click(prevBtn);
    expect(props.onMonthChange).toHaveBeenCalledWith(2025, 12);
  });
});
