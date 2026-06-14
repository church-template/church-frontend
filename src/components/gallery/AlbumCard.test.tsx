import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { AlbumCard } from "./AlbumCard";
import type { GalleryAlbumCardResponse } from "@/lib/api/types";

const base: GalleryAlbumCardResponse = {
  id: 3,
  title: "여름 수련회",
  thumbnailMediaId: 42,
  photoCount: 12,
  createdAt: "2026-06-14T10:00:00",
  tags: [{ id: 1, name: "수련회" }],
  author: "관리자",
};

describe("AlbumCard", () => {
  it("상세 링크와 썸네일 URL을 렌더한다", () => {
    const { container } = render(<AlbumCard album={base} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/gallery/albums/3");
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/api/media/42");
  });

  it("thumbnailMediaId가 null이면 이미지 대신 플레이스홀더를 렌더한다", () => {
    const { container } = render(<AlbumCard album={{ ...base, thumbnailMediaId: null }} />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("제목·작성일·사진 수·작성자·태그를 표시한다", () => {
    render(<AlbumCard album={base} />);
    expect(screen.getByText("여름 수련회")).toBeDefined();
    expect(screen.getByText(/사진 12장/)).toBeDefined();
    expect(screen.getByText(/관리자/)).toBeDefined();
    expect(screen.getByText("수련회")).toBeDefined();
  });

  it("작성자가 없으면 작성자 텍스트를 생략한다", () => {
    render(<AlbumCard album={{ ...base, author: null }} />);
    expect(screen.queryByText(/관리자/)).toBeNull();
  });
});
