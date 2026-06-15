import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const { useAlbumMock } = vi.hoisted(() => ({ useAlbumMock: vi.fn() }));
vi.mock("./queries", () => ({ useAlbum: useAlbumMock }));
vi.mock("./PhotoGrid", () => ({ PhotoGrid: () => "PHOTOGRID" }));
// AlbumDetailActions(useRouter·RequirePermission 포함) 무력화 — 권한 게이트 동작은 GalleryAdminActions.test에서 검증.
vi.mock("./GalleryAdminActions", () => ({ AlbumDetailActions: () => null, AlbumListAction: () => null }));
vi.mock("@/components/common/MarkdownContent", () => ({
  MarkdownContent: ({ source }: { source: string }) => <div>{source}</div>,
}));

import { AlbumDetail } from "./AlbumDetail";

function detailState(over: Record<string, unknown>) {
  return { data: undefined, isPending: false, isError: false, refetch: vi.fn(), ...over };
}
const album = {
  id: 5, title: "가을 행사", description: "본문 마크다운", tags: [{ id: 2, name: "행사" }],
  author: "관리자", createdAt: "2026-06-14T10:00:00", updatedAt: "x", version: 0,
  photos: [{ id: 1, mediaId: 10, caption: null, sortOrder: 0 }],
};

beforeEach(() => useAlbumMock.mockReset());

describe("AlbumDetail", () => {
  it("로딩 중엔 제목을 렌더하지 않는다", () => {
    useAlbumMock.mockReturnValue(detailState({ isPending: true }));
    render(<AlbumDetail id={5} />);
    expect(screen.queryByText("가을 행사")).toBeNull();
  });

  it("에러면 다시 시도 버튼을 보인다", () => {
    useAlbumMock.mockReturnValue(detailState({ isError: true }));
    render(<AlbumDetail id={5} />);
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeDefined();
  });

  it("성공 시 제목·메타·태그·마크다운·사진그리드를 렌더한다", () => {
    useAlbumMock.mockReturnValue(detailState({ data: album }));
    render(<AlbumDetail id={5} />);
    expect(screen.getByText("가을 행사")).toBeDefined();
    expect(screen.getByText(/사진 1장/)).toBeDefined();
    expect(screen.getByText("행사").closest("a")?.getAttribute("href")).toBe("/gallery?tagId=2");
    expect(screen.getByText("본문 마크다운")).toBeDefined();
    expect(screen.getByText("PHOTOGRID")).toBeDefined();
  });

  it("description이 없으면 마크다운을 렌더하지 않지만 사진그리드는 보인다", () => {
    useAlbumMock.mockReturnValue(detailState({ data: { ...album, description: null } }));
    render(<AlbumDetail id={5} />);
    expect(screen.queryByText("본문 마크다운")).toBeNull();
    expect(screen.getByText("PHOTOGRID")).toBeDefined();
  });
});
