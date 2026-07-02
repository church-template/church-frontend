import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { WORSHIP, SPECIAL_SERVICES } from "@/constants/content";

// EventCard가 next/link를 모듈 임포트 — href 없어 렌더되진 않지만 EventCard.test 관례대로 안전 모킹.
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { WorshipSpecial } from "./WorshipSpecial";

describe("WorshipSpecial", () => {
  it("특별 예배 6종을 날짜·제목·설명과 함께 렌더한다", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<WorshipSpecial />);

    expect(
      screen.getByRole("heading", { level: 2, name: WORSHIP.specialHeading }),
    ).toBeDefined();
    // EventCard 제목은 h3 — 6개(slice 회귀 방지)
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(SPECIAL_SERVICES.length);

    const first = SPECIAL_SERVICES[0]; // 송구영신 예배 — date/time/desc가 6종 중 유일값
    expect(screen.getByText(first.name)).toBeDefined();
    expect(screen.getByText(first.date)).toBeDefined();
    expect(screen.getByText(first.time)).toBeDefined();
    expect(screen.getByText(first.desc)).toBeDefined();
  });
});
