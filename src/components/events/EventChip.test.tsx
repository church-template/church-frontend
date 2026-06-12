import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventChip } from "./EventChip";
import type { EventCardResponse } from "@/lib/api/types";

afterEach(() => vi.clearAllMocks());

const ev = (o: Partial<EventCardResponse>): EventCardResponse => ({
  id: 1, title: "성가대 연습", location: null, startAt: "2026-06-14T10:00:00",
  endAt: null, allDay: false, tags: [], ...o,
});

describe("EventChip", () => {
  it("타임드는 'HH:mm 제목'", () => {
    render(<EventChip event={ev({})} onSelect={() => {}} />);
    expect(screen.getByRole("button").textContent).toBe("10:00 성가대 연습");
  });
  it("allDay는 제목만(시간 미표기, 검수 ⑤)", () => {
    render(<EventChip event={ev({ allDay: true, title: "야유회" })} onSelect={() => {}} />);
    const btn = screen.getByRole("button");
    expect(btn.textContent).toBe("야유회");
    expect(btn.textContent).not.toMatch(/\d{2}:\d{2}/);
  });
  it("클릭 시 onSelect(event)", () => {
    const onSelect = vi.fn();
    const e = ev({});
    render(<EventChip event={e} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(e);
  });
});
