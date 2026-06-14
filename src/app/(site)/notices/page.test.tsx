import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const { getNotices, getTags } = vi.hoisted(() => ({
  getNotices: vi.fn(),
  getTags: vi.fn(async () => [{ id: 3, name: "행사" }]),
}));
vi.mock("@/lib/api/notices", () => ({ getNotices }));
vi.mock("@/lib/api/tags", () => ({ getTags }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
// 클라이언트 자식은 스텁(next/navigation·useMe 의존 차단) — 각자 단위 테스트가 커버.
vi.mock("@/components/common/SearchPill", () => ({ SearchPill: () => <div data-testid="search" /> }));
vi.mock("@/components/notices/NoticeAdminActions", () => ({ NoticeListAction: () => null }));
vi.mock("@/components/common/TagFilter", () => ({
  TagFilter: ({ tags }: { tags: unknown[] }) => <div data-testid="tagfilter" data-count={tags.length} />,
}));
vi.mock("@/components/common/Pagination", () => ({
  Pagination: ({ page }: { page: { totalPages: number } }) => (
    <div data-testid="pagination" data-total={page.totalPages} />
  ),
}));

import NoticesPage from "./page";

afterEach(() => vi.clearAllMocks());

const emptyPage = { content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } };

describe("NoticesPage (목록)", () => {
  it("searchParams를 파싱해 getNotices에 전달", async () => {
    getNotices.mockResolvedValueOnce(emptyPage);
    render(await NoticesPage({ searchParams: Promise.resolve({ q: "수련회", tagId: "3", page: "0" }) }));
    expect(getNotices).toHaveBeenCalledWith(
      expect.objectContaining({ q: "수련회", tagId: 3, page: 0 }),
    );
    expect(getTags).toHaveBeenCalled();
  });

  it("잘못된 쿼리 파라미터는 기본값으로 방어", async () => {
    getNotices.mockResolvedValueOnce(emptyPage);
    render(await NoticesPage({ searchParams: Promise.resolve({ tagId: "abc", page: "xyz" }) }));
    expect(getNotices).toHaveBeenCalledWith(
      expect.objectContaining({ tagId: undefined, page: undefined }),
    );
  });

  it("빈 목록이면 EmptyState", async () => {
    getNotices.mockResolvedValueOnce(emptyPage);
    render(await NoticesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("조건에 맞는 공지가 없습니다.")).toBeDefined();
  });

  it("행을 서버 순서대로 렌더(고정 우선 재정렬 안 함)·상세 링크·고정 배지, totalPages>1이면 Pagination", async () => {
    getNotices.mockResolvedValueOnce({
      content: [
        { id: 5, title: "고정 공지", isPinned: true, viewCount: 10, createdAt: "2026-06-01T09:00:00", tags: [], author: null },
        { id: 4, title: "일반 공지", isPinned: false, viewCount: 3, createdAt: "2026-05-28T09:00:00", tags: [], author: null },
      ],
      page: { size: 10, number: 0, totalElements: 20, totalPages: 2 },
    });
    render(await NoticesPage({ searchParams: Promise.resolve({}) }));
    // 서버가 준 순서 그대로 — 고정 공지(id 5)가 먼저
    const links = screen.getAllByRole("link");
    expect(links[0].getAttribute("href")).toBe("/notices/5");
    expect(links[1].getAttribute("href")).toBe("/notices/4");
    // 고정 배지·날짜 포맷·페이지네이션
    expect(screen.getByText("고정")).toBeDefined();
    expect(screen.getByText(/2026\. 6\. 1\./)).toBeDefined();
    expect(screen.getByTestId("pagination").getAttribute("data-total")).toBe("2");
  });
});
