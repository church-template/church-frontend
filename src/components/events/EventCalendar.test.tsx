import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
// 모달은 별도 단위테스트가 커버 — 여기선 열림 여부만 확인하도록 스텁.
vi.mock("./EventDetailModal", () => ({
  EventDetailModal: ({ event }: { event: { id: number } | null }) =>
    event ? <div data-testid="modal" data-id={event.id} /> : null,
}));

import { EventCalendar } from "./EventCalendar";
import { buildCalendarModel } from "@/lib/calendar";
import type { EventCardResponse } from "@/lib/api/types";

const ev = (o: Partial<EventCardResponse>): EventCardResponse => ({
  id: 1, title: "t", location: null, startAt: "2026-06-10T10:00:00",
  endAt: null, allDay: false, tags: [], ...o,
});

// 6/10에 5건, 6/15(오늘) 1건 all-day
const events = [
  ...[1, 2, 3, 4, 5].map((i) => ev({ id: i, title: `이벤트${i}`, startAt: "2026-06-10T0" + i + ":00:00" })),
  ev({ id: 9, title: "야유회", allDay: true, startAt: "2026-06-15T00:00:00" }),
];
const model = buildCalendarModel({ year: 2026, month: 6, today: { y: 2026, m: 6, d: 15 }, events });

describe("EventCalendar", () => {
  it("월 네비 href가 year·month·tagId를 보존", () => {
    render(<EventCalendar model={model} tagId={3} />);
    expect(screen.getByLabelText("이전 달").getAttribute("href")).toBe("/events?year=2026&month=5&tagId=3");
    expect(screen.getByLabelText("다음 달").getAttribute("href")).toBe("/events?year=2026&month=7&tagId=3");
    expect(screen.getByRole("link", { name: "오늘" }).getAttribute("href")).toBe("/events?year=2026&month=6&tagId=3");
  });

  it("그리드: 셀당 칩 최대 3 + '+2', 오늘 마커(primary-soft)", () => {
    render(<EventCalendar model={model} tagId={undefined} />);
    const grid = screen.getByTestId("calendar-grid");
    // 6/10 셀: 칩 3개 노출 + "+2"
    expect(within(grid).getByText("+2")).toBeDefined();
    expect(within(grid).getByText(/이벤트1$/)).toBeDefined();
    expect(within(grid).queryByText(/이벤트5$/)).toBeNull(); // 4·5는 접힘(Popover 미오픈)
    // 오늘(15) 마커
    expect(within(grid).getByText("15").className).toContain("bg-primary-soft");
  });

  it("allDay 칩은 시간 미표기(검수 ⑤)", () => {
    render(<EventCalendar model={model} tagId={undefined} />);
    const grid = screen.getByTestId("calendar-grid");
    const chip = within(grid).getByText("야유회");
    expect(chip.textContent).not.toMatch(/\d{2}:\d{2}/);
  });

  it("모바일 목록: 날짜 그룹 헤더 + 칩 클릭 시 모달 오픈", () => {
    render(<EventCalendar model={model} tagId={undefined} />);
    const list = screen.getByTestId("calendar-list");
    expect(within(list).getByText("6월 15일 (월)")).toBeDefined();
    fireEvent.click(within(list).getAllByText("야유회")[0]);
    expect(screen.getByTestId("modal").getAttribute("data-id")).toBe("9");
  });

  it("이벤트 없으면 모바일 목록에 EmptyState", () => {
    const empty = buildCalendarModel({ year: 2026, month: 6, today: { y: 2026, m: 6, d: 15 }, events: [] });
    render(<EventCalendar model={empty} tagId={undefined} />);
    const list = screen.getByTestId("calendar-list");
    expect(within(list).getByText("등록된 일정이 없습니다.")).toBeDefined();
  });
});
