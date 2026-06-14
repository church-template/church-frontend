import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

// next/link → plain <a> (DepartmentCard.test.tsx 컨벤션과 동일)
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const { useAlbumsMock, useGalleryTagsMock } = vi.hoisted(() => ({
  useAlbumsMock: vi.fn(),
  useGalleryTagsMock: vi.fn(),
}));
vi.mock("./queries", () => ({ useAlbums: useAlbumsMock, useGalleryTags: useGalleryTagsMock }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("") }));
// 자식 컴포넌트는 격리 — 링크 중복/Suspense 회피.
vi.mock("@/components/common/TagFilter", () => ({ TagFilter: () => null }));
vi.mock("@/components/common/Pagination", () => ({ Pagination: () => "PAGINATION" }));

import { AlbumList } from "./AlbumList";

function albumsState(over: Record<string, unknown>) {
  return { data: undefined, isPending: false, isError: false, refetch: vi.fn(), ...over };
}
const card = {
  id: 1, title: "A", thumbnailMediaId: null, photoCount: 0,
  createdAt: "2026-06-14T10:00:00", tags: [], author: null,
};

beforeEach(() => {
  useAlbumsMock.mockReset();
  useGalleryTagsMock.mockReturnValue({ data: [], isPending: false, isError: false });
});

describe("AlbumList", () => {
  it("로딩 중엔 카드 링크가 없다(스켈레톤)", () => {
    useAlbumsMock.mockReturnValue(albumsState({ isPending: true }));
    render(<AlbumList />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("빈 배열이면 EmptyState를 보인다", () => {
    useAlbumsMock.mockReturnValue(albumsState({ data: { content: [], page: { size: 12, number: 0, totalElements: 0, totalPages: 0 } } }));
    render(<AlbumList />);
    expect(screen.getByText("등록된 앨범이 없습니다.")).toBeDefined();
  });

  it("앨범이 있으면 카드 그리드를 보인다", () => {
    useAlbumsMock.mockReturnValue(albumsState({ data: { content: [card], page: { size: 12, number: 0, totalElements: 1, totalPages: 1 } } }));
    render(<AlbumList />);
    expect(screen.getByText("A")).toBeDefined();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/gallery/albums/1");
  });

  it("여러 페이지면 페이지네이션을 보인다", () => {
    useAlbumsMock.mockReturnValue(albumsState({ data: { content: [card], page: { size: 12, number: 0, totalElements: 30, totalPages: 3 } } }));
    render(<AlbumList />);
    expect(screen.queryByText("PAGINATION")).not.toBeNull();
  });

  it("한 페이지면 페이지네이션을 숨긴다", () => {
    useAlbumsMock.mockReturnValue(albumsState({ data: { content: [card], page: { size: 12, number: 0, totalElements: 1, totalPages: 1 } } }));
    render(<AlbumList />);
    expect(screen.queryByText("PAGINATION")).toBeNull();
  });

  it("에러면 다시 시도 버튼을 보이고, 클릭하면 refetch를 호출한다", () => {
    const refetch = vi.fn();
    useAlbumsMock.mockReturnValue(albumsState({ isError: true, refetch }));
    render(<AlbumList />);
    const btn = screen.getByRole("button", { name: "다시 시도" });
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(refetch).toHaveBeenCalled();
  });
});
