import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { WORSHIP, MAIN_SECTIONS, CTA_BAND, HISTORY, MINISTRY } from "@/constants/content";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/api/main", () => ({
  getMain: async () => ({
    sermons: [
      {
        id: 1,
        title: "부활의 증인",
        preacher: "김목사",
        series: null,
        scripture: null,
        preachedAt: "2026-06-01",
        viewCount: 0,
        tags: [],
      },
    ],
    notices: [
      {
        id: 2,
        title: "전교인 수련회 안내",
        isPinned: true,
        viewCount: 0,
        createdAt: "2026-06-02T09:00:00",
        tags: [],
      },
    ],
    upcomingEvents: [
      {
        id: 3,
        title: "성가대 연습",
        location: "본당",
        startAt: "2026-06-14T10:00:00",
        endAt: null,
        allDay: false,
        tags: [],
      },
    ],
  }),
}));

import Home from "./page";

function stubBrowserApis() {
  // jsdom 미구현 API — CrossHero(matchMedia)·HeroHeaderSync(IO)가 사용.
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Home (메인)", () => {
  it("예배·설교·공지·일정 섹션과 CTA·푸터를 합성한다", async () => {
    stubBrowserApis();
    const { container } = render(await Home());
    // 섹션 타이틀은 h2(heading)로 좁힘 — 푸터 nav <a>와 텍스트 중복 방어
    expect(screen.getByRole("heading", { name: WORSHIP.title })).toBeDefined();
    expect(screen.getByRole("heading", { name: MAIN_SECTIONS.sermons.title })).toBeDefined();
    expect(screen.getByText("부활의 증인")).toBeDefined();
    expect(screen.getByRole("heading", { name: MAIN_SECTIONS.notices.title })).toBeDefined();
    expect(screen.getByText("전교인 수련회 안내")).toBeDefined();
    expect(screen.getByRole("heading", { name: MAIN_SECTIONS.events.title })).toBeDefined();
    expect(screen.getByText("성가대 연습")).toBeDefined();
    expect(screen.getByText(CTA_BAND.heading)).toBeDefined();
    expect(screen.getByRole("contentinfo")).toBeDefined();
    expect(screen.getByText("부활의 증인").closest("a")?.getAttribute("href")).toBe(
      "/sermons/1",
    );
    // 콜라주 타일이 히어로와 예배시간 사이에 합성된다(MediaCollage 스펙 §5)
    expect(container.querySelector('img[src="/collage-1.jpeg"]')).not.toBeNull();
    // 연혁·사역 섹션이 콜라주 뒤에 합성된다(스펙 H1)
    const collageImg = container.querySelector('img[src="/collage-1.jpeg"]')!;
    const historyHead = screen.getByText(HISTORY.items[0].text);
    expect(
      collageImg.compareDocumentPosition(historyHead) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: MINISTRY.title })).toBeDefined();
  });

  it("히어로 카피는 줄 단위로 DOM에 존재한다(SEO)", async () => {
    stubBrowserApis();
    const { HERO_CAPTION } = await import("@/constants/church");
    render(await Home());
    for (const line of HERO_CAPTION) {
      expect(screen.getByText(line)).toBeDefined();
    }
  });
});
