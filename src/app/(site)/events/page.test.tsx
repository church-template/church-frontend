import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { getEvents, getTags } = vi.hoisted(() => ({
  getEvents: vi.fn(),
  getTags: vi.fn(async () => [{ id: 3, name: "행사" }]),
}));
vi.mock("@/lib/api/events", () => ({ getEvents, EVENTS_PAGE_SIZE: 200 }));
vi.mock("@/lib/api/tags", () => ({ getTags }));
// 캘린더 코어는 단위테스트가 커버 — 월 결정만 고정.
vi.mock("@/lib/calendar", () => ({
  resolveMonth: vi.fn(() => ({ year: 2026, month: 6 })),
  buildCalendarModel: vi.fn(() => ({ year: 2026, month: 6, today: { y: 2026, m: 6, d: 15 }, weeks: [], dayGroups: [] })),
  kstCivilFromDate: vi.fn(() => ({ y: 2026, m: 6, d: 15 })),
}));
vi.mock("@/components/common/TagFilter", () => ({
  TagFilter: ({ tags }: { tags: unknown[] }) => <div data-testid="tagfilter" data-count={tags.length} />,
}));
vi.mock("@/components/events/EventCalendar", () => ({
  EventCalendar: ({ tagId }: { tagId?: number }) => <div data-testid="calendar" data-tag={String(tagId)} />,
}));

import EventsPage from "./page";

afterEach(() => vi.clearAllMocks());
const emptyPage = { content: [], page: { size: 200, number: 0, totalElements: 0, totalPages: 0 } };

describe("EventsPage", () => {
  it("year·month·tagId를 size=200으로 getEvents에 전달, 태그 병렬", async () => {
    getEvents.mockResolvedValueOnce(emptyPage);
    render(await EventsPage({ searchParams: Promise.resolve({ year: "2026", month: "6", tagId: "3" }) }));
    expect(getEvents).toHaveBeenCalledWith({ year: 2026, month: 6, tagId: 3, size: 200 });
    expect(getTags).toHaveBeenCalled();
    expect(screen.getByTestId("tagfilter").getAttribute("data-count")).toBe("1");
    expect(screen.getByTestId("calendar").getAttribute("data-tag")).toBe("3");
  });

  it("파라미터 없으면 resolveMonth 폴백 월로 조회(tagId 미전달)", async () => {
    getEvents.mockResolvedValueOnce(emptyPage);
    render(await EventsPage({ searchParams: Promise.resolve({}) }));
    expect(getEvents).toHaveBeenCalledWith({ year: 2026, month: 6, tagId: undefined, size: 200 });
  });
});
