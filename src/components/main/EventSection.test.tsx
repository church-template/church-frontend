import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MAIN_SECTIONS } from "@/constants/content";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { EventSection } from "./EventSection";

describe("EventSection", () => {
  it("카드 매핑 — 날짜 배지·시간줄·장소·상세 링크", () => {
    render(
      <EventSection
        events={[
          {
            id: 3,
            title: "성가대 연습",
            location: "본당",
            startAt: "2026-06-14T10:00:00",
            endAt: "2026-06-14T12:00:00",
            allDay: false,
            tags: [],
          },
        ]}
      />,
    );
    expect(screen.getByText(MAIN_SECTIONS.events.title)).toBeDefined();
    expect(screen.getByText("2026. 6. 14.")).toBeDefined();
    expect(screen.getByText("10:00 ~ 12:00")).toBeDefined();
    expect(screen.getByText("본당")).toBeDefined();
    expect(screen.getByText("성가대 연습").closest("a")?.getAttribute("href")).toBe(
      "/events/3",
    );
  });

  it("allDay 이벤트는 시간줄 없이 렌더한다(13.2 엣지)", () => {
    render(
      <EventSection
        events={[
          {
            id: 4,
            title: "전교인 야유회",
            location: null,
            startAt: "2026-06-20T00:00:00",
            endAt: null,
            allDay: true,
            tags: [],
          },
        ]}
      />,
    );
    expect(screen.getByText("전교인 야유회")).toBeDefined();
    expect(screen.getByText("2026. 6. 20.")).toBeDefined();
    expect(screen.queryByText(/\d{2}:\d{2}/)).toBeNull();
  });

  it("빈 배열이면 섹션 유지 + EmptyState", () => {
    render(<EventSection events={[]} />);
    expect(screen.getByText(MAIN_SECTIONS.events.empty)).toBeDefined();
  });
});
