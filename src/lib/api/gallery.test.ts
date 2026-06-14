import { describe, it, expect, vi, beforeEach } from "vitest";

const authFetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));

import { fetchAlbums, fetchAlbum, GALLERY_PAGE_SIZE } from "./gallery";

function jsonRes(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
const emptyPage = { content: [], page: { size: GALLERY_PAGE_SIZE, number: 0, totalElements: 0, totalPages: 0 } };

beforeEach(() => authFetchMock.mockReset());

describe("fetchAlbums", () => {
  it("기본 쿼리: page·size·sort 포함, tagId 없으면 생략", async () => {
    authFetchMock.mockResolvedValue(jsonRes(emptyPage));
    await fetchAlbums({ page: 0 });
    expect(authFetchMock).toHaveBeenCalledWith(
      `/api/gallery/albums?page=0&size=${GALLERY_PAGE_SIZE}&sort=createdAt%2Cdesc`,
    );
  });

  it("tagId가 있으면 쿼리에 포함", async () => {
    authFetchMock.mockResolvedValue(jsonRes(emptyPage));
    await fetchAlbums({ page: 1, tagId: 5 });
    const url = authFetchMock.mock.calls[0][0] as string;
    expect(url).toContain("page=1");
    expect(url).toContain(`size=${GALLERY_PAGE_SIZE}`);
    expect(url).toContain("tagId=5");
  });

  it("응답 봉투를 그대로 파싱한다", async () => {
    authFetchMock.mockResolvedValue(
      jsonRes({
        content: [
          { id: 1, title: "A", thumbnailMediaId: null, photoCount: 0, createdAt: "2026-06-14T10:00:00", tags: [], author: null },
        ],
        page: { size: 12, number: 0, totalElements: 1, totalPages: 1 },
      }),
    );
    const data = await fetchAlbums({});
    expect(data.content[0].title).toBe("A");
    expect(data.page.totalElements).toBe(1);
  });
});

describe("fetchAlbum", () => {
  it("경로에 id를 포함하고 상세를 반환한다", async () => {
    authFetchMock.mockResolvedValue(
      jsonRes({ id: 7, title: "T", description: null, tags: [], author: null, createdAt: "x", updatedAt: "x", version: 0, photos: [] }),
    );
    const a = await fetchAlbum(7);
    expect(authFetchMock).toHaveBeenCalledWith("/api/gallery/albums/7");
    expect(a.id).toBe(7);
  });
});
