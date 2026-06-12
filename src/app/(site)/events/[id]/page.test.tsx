import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const { getEvent } = vi.hoisted(() => ({ getEvent: vi.fn() }));
vi.mock("@/lib/api/events", () => ({ getEvent }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import EventDetailPage from "./page";

afterEach(() => vi.clearAllMocks());

const detail = {
  id: 3, title: "성가대 연습", description: "악보 지참", location: "본당",
  startAt: "2026-06-14T10:00:00", endAt: "2026-06-14T12:00:00", allDay: false,
  createdAt: "2026-06-01T09:00:00", updatedAt: "2026-06-01T09:00:00", version: 0,
  tags: [{ id: 3, name: "행사" }],
};

describe("EventDetailPage (딥링크)", () => {
  it("제목·상세 본문 렌더", async () => {
    getEvent.mockResolvedValueOnce(detail);
    const { container } = render(await EventDetailPage({ params: Promise.resolve({ id: "3" }) }));
    expect(getEvent).toHaveBeenCalledWith(3);
    expect(screen.getByRole("heading", { name: "성가대 연습" })).toBeDefined();
    expect(container.textContent).toContain("10:00 ~ 12:00");
    expect(container.querySelector(".prose-church")?.textContent).toContain("악보 지참");
  });
  it("없는 일정(null)이면 notFound", async () => {
    getEvent.mockResolvedValueOnce(null);
    await expect(EventDetailPage({ params: Promise.resolve({ id: "99" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it("비숫자·0·음수 id면 notFound(fetch 미호출)", async () => {
    await expect(EventDetailPage({ params: Promise.resolve({ id: "abc" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(EventDetailPage({ params: Promise.resolve({ id: "0" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getEvent).not.toHaveBeenCalled();
  });
});
