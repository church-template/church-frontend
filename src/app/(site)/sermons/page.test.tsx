// src/app/(site)/sermons/page.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const { getSermons, getTags } = vi.hoisted(() => ({
  getSermons: vi.fn(),
  getTags: vi.fn(async () => [{ id: 3, name: "주일설교" }]),
}));
vi.mock("@/lib/api/sermons", () => ({ getSermons }));
vi.mock("@/lib/api/tags", () => ({ getTags }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
// 클라이언트 자식은 스텁(next/navigation·useMe 의존 차단) — 각자 단위 테스트가 커버.
vi.mock("@/components/sermons/SermonSearch", () => ({ SermonSearch: () => <div data-testid="search" /> }));
vi.mock("@/components/sermons/ActiveFilters", () => ({ ActiveFilters: () => <div data-testid="active" /> }));
vi.mock("@/components/sermons/SermonAdminActions", () => ({ SermonListAction: () => null }));
vi.mock("@/components/common/TagFilter", () => ({
  TagFilter: ({ tags }: { tags: unknown[] }) => <div data-testid="tagfilter" data-count={tags.length} />,
}));
vi.mock("@/components/common/Pagination", () => ({
  Pagination: ({ page }: { page: { totalPages: number } }) => (
    <div data-testid="pagination" data-total={page.totalPages} />
  ),
}));

import SermonsPage from "./page";

afterEach(() => vi.clearAllMocks());

const emptyPage = { content: [], page: { size: 12, number: 0, totalElements: 0, totalPages: 0 } };

describe("SermonsPage (목록)", () => {
  it("searchParams를 파싱해 getSermons에 전달", async () => {
    getSermons.mockResolvedValueOnce(emptyPage);
    render(await SermonsPage({ searchParams: Promise.resolve({ q: "은혜", tagId: "3", page: "0" }) }));
    expect(getSermons).toHaveBeenCalledWith(
      expect.objectContaining({ q: "은혜", tagId: 3, page: 0 }),
    );
    expect(getTags).toHaveBeenCalled();
  });

  it("빈 목록이면 EmptyState", async () => {
    getSermons.mockResolvedValueOnce(emptyPage);
    render(await SermonsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("조건에 맞는 설교가 없습니다.")).toBeDefined();
  });

  it("잘못된 쿼리 파라미터는 기본값으로 방어", async () => {
    getSermons.mockResolvedValueOnce(emptyPage);
    render(
      await SermonsPage({
        searchParams: Promise.resolve({ tagId: "abc", page: "2.5", from: "not-a-date", to: "2026-12-31" }),
      }),
    );
    expect(getSermons).toHaveBeenCalledWith(
      expect.objectContaining({ tagId: undefined, from: undefined, to: "2026-12-31" }),
    );
  });

  it("카드를 상세 링크·포맷 날짜로 렌더, totalPages>1이면 Pagination", async () => {
    getSermons.mockResolvedValueOnce({
      content: [
        {
          id: 7, title: "은혜의 강가에서", preacher: "김목사",
          series: "여름", scripture: "요 4:1-14", preachedAt: "2026-06-08",
          viewCount: 1240, tags: [{ id: 3, name: "주일설교" }], author: "홍길동",
        },
      ],
      page: { size: 12, number: 0, totalElements: 20, totalPages: 2 },
    });
    render(await SermonsPage({ searchParams: Promise.resolve({}) }));
    const link = screen.getByRole("heading", { name: "은혜의 강가에서" }).closest("a");
    expect(link?.getAttribute("href")).toBe("/sermons/7");
    expect(screen.getByText(/2026\. 6\. 8\./)).toBeDefined();
    expect(screen.getByTestId("pagination").getAttribute("data-total")).toBe("2");
  });
});
