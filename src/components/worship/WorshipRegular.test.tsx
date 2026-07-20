import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { WORSHIP, WORSHIP_SERVICES } from "@/constants/content";
import { WorshipRegular } from "./WorshipRegular";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

describe("WorshipRegular", () => {
  it("제목(h1)·리드·정기 예배 4카드(이름·시간·찬양·설명)를 렌더한다", () => {
    // Reveal이 useEffect에서 matchMedia 호출 — jsdom 미구현이라 reduced 경로로 스텁(about/* 관례).
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<WorshipRegular />);

    expect(screen.getByRole("heading", { level: 1, name: WORSHIP.title })).toBeDefined();
    expect(screen.getByText(WORSHIP.regularLead)).toBeDefined();
    // 예배명은 h3 — 4종 전부(slice 회귀 방지)
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(WORSHIP_SERVICES.length);

    const sunday = WORSHIP_SERVICES.find((s) => s.name === "주일예배")!;
    expect(screen.getByText(sunday.time)).toBeDefined();
    expect(screen.getByText(sunday.praise!)).toBeDefined();
    expect(screen.getByText(sunday.notes[0])).toBeDefined();
  });

  it("대표시간을 강조 위계(datetime-lg·ink)로 렌더하고 설교 진입 CTA를 둔다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<WorshipRegular />);

    const sunday = WORSHIP_SERVICES.find((s) => s.name === "주일예배")!;
    const time = screen.getByText(sunday.time);
    expect(time.className).toContain("text-datetime-lg");
    expect(time.className).toContain("text-ink");

    const cta = screen.getByRole("link", { name: WORSHIP.sermonCta });
    expect(cta.getAttribute("href")).toBe("/sermons");
  });
});
