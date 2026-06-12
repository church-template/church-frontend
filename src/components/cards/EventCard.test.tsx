import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { EventCard } from "./EventCard";

describe("EventCard", () => {
  it("시간·장소가 있으면 메인 일정 카드로 렌더한다(summary 없음)", () => {
    render(
      <EventCard
        date="2026. 6. 14."
        title="성가대 연습"
        time="10:00 ~ 12:00"
        location="본당"
        href="/events/3"
      />,
    );
    expect(screen.getByText("성가대 연습")).toBeDefined();
    expect(screen.getByText("10:00 ~ 12:00")).toBeDefined();
    expect(screen.getByText("본당")).toBeDefined();
    expect(screen.getByText("성가대 연습").closest("a")?.getAttribute("href")).toBe(
      "/events/3",
    );
  });

  it("time이 null이면 시간줄을 생략한다(allDay)", () => {
    render(<EventCard date="2026. 6. 14." title="전교인 야유회" time={null} />);
    expect(screen.getByText("전교인 야유회")).toBeDefined();
    expect(screen.queryByText("null")).toBeNull();
  });

  it("summary 방식도 그대로 동작한다(회귀)", () => {
    render(<EventCard date="6월 14일" title="t" summary="행사 요약" />);
    expect(screen.getByText("행사 요약")).toBeDefined();
  });

  it("date가 없으면 날짜 배지를 생략한다(모바일 목록 — 그룹 헤더가 날짜 담당)", () => {
    render(<EventCard title="성가대 연습" time="10:00 ~ 12:00" location="본당" />);
    expect(screen.getByText("성가대 연습")).toBeDefined();
    expect(screen.getByText("10:00 ~ 12:00")).toBeDefined();
    expect(screen.queryByText("2026. 6. 14.")).toBeNull();
  });
});
