import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { EventDetailView } from "./EventDetailView";
import type { EventDetailResponse } from "@/lib/api/types";

const base: EventDetailResponse = {
  id: 3, title: "성가대 연습", description: "# 준비물\n악보 지참",
  location: "본당", startAt: "2026-06-14T10:00:00", endAt: "2026-06-14T12:00:00",
  allDay: false, createdAt: "2026-06-01T09:00:00", updatedAt: "2026-06-01T09:00:00",
  version: 0, tags: [{ id: 3, name: "행사" }],
};

describe("EventDetailView", () => {
  it("시각줄·장소·태그 링크·마크다운 본문", () => {
    const { container } = render(<EventDetailView event={base} />);
    expect(container.textContent).toContain("2026. 6. 14.");
    expect(container.textContent).toContain("10:00 ~ 12:00");
    expect(screen.getByText("본당")).toBeDefined();
    expect(screen.getByRole("link", { name: "행사" }).getAttribute("href")).toBe("/events?tagId=3");
    expect(container.querySelector(".prose-church")?.textContent).toContain("악보 지참");
  });
  it("allDay는 시각 미표기(검수 ⑤), description 없으면 본문 생략", () => {
    const { container } = render(
      <EventDetailView event={{ ...base, allDay: true, endAt: null, description: null }} />,
    );
    expect(container.textContent).toContain("2026. 6. 14.");
    expect(container.textContent).not.toMatch(/\d{2}:\d{2}/);
    expect(container.querySelector(".prose-church")).toBeNull();
  });
  it("allDay 다일은 '~ M. D.'(날짜 표기 — 시간 아님)", () => {
    const { container } = render(
      <EventDetailView event={{ ...base, allDay: true, startAt: "2026-06-14T00:00:00", endAt: "2026-06-16T00:00:00" }} />,
    );
    expect(container.textContent).toContain("~ 6. 15.");
    expect(container.textContent).not.toMatch(/\d{2}:\d{2}/);
  });
});
