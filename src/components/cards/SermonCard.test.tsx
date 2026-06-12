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

import { SermonCard } from "./SermonCard";

describe("SermonCard", () => {
  it("썸네일 없이 텍스트형으로 렌더한다(보조줄·태그·링크)", () => {
    const { container } = render(
      <SermonCard
        title="부활의 증인"
        preacher="김목사"
        date="2026. 6. 1."
        series="요한복음 시리즈"
        scripture="요한복음 20:19-23"
        tags={["부활", "요한복음"]}
        href="/sermons/1"
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("요한복음 시리즈 · 요한복음 20:19-23")).toBeDefined();
    expect(screen.getByText("부활의 증인")).toBeDefined();
    expect(screen.getByText("김목사 · 2026. 6. 1.")).toBeDefined();
    expect(screen.getByText("부활")).toBeDefined();
    expect(screen.getByText("부활의 증인").closest("a")?.getAttribute("href")).toBe(
      "/sermons/1",
    );
  });

  it("series만 있으면 보조줄에 구분점 없이 표기한다", () => {
    render(<SermonCard title="t" preacher="p" date="d" series="요한복음 시리즈" />);
    expect(screen.getByText("요한복음 시리즈")).toBeDefined();
  });

  it("인터랙티브 카드는 h-full로 그리드 셀을 채운다(태그 유무 무관 동일 높이)", () => {
    const { container } = render(
      <SermonCard title="t" preacher="p" date="d" href="/sermons/1" />,
    );
    const link = container.querySelector("a");
    expect(link?.className).toContain("h-full"); // Link가 셀 높이로 stretch
    const card = link?.firstElementChild as HTMLElement;
    expect(card?.className).toContain("h-full"); // Card가 Link를 채움
  });

  it("thumbnailUrl이 있으면 기존 썸네일 카드를 유지한다(회귀)", () => {
    const { container } = render(
      <SermonCard thumbnailUrl="/t.jpg" title="t" preacher="p" date="d" />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/t.jpg");
  });
});
