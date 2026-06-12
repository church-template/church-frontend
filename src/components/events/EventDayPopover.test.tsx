import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventDayPopover } from "./EventDayPopover";
import type { EventCardResponse } from "@/lib/api/types";

const ev = (id: number): EventCardResponse => ({
  id, title: `이벤트${id}`, location: null, startAt: "2026-06-14T10:00:00",
  endAt: null, allDay: false, tags: [],
});

describe("EventDayPopover", () => {
  it("트리거에 '+초과개수'를 표시(셀 표시 3개 기준)", () => {
    render(<EventDayPopover events={[ev(1), ev(2), ev(3), ev(4), ev(5)]} onSelect={() => {}} />);
    // 닫힘 상태 — 트리거만 렌더(Popover 내용은 Radix Portal, 미오픈)
    expect(screen.getByRole("button").textContent).toBe("+2");
  });
});
