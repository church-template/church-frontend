import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import { buildListQuery, type Page } from "@/lib/page";
import type { GalleryAlbumCardResponse, GalleryAlbumDetailResponse } from "./types";

// 한 페이지 앨범 수(3열 × 4행). 컴포넌트 인라인 금지 — 모듈 상수.
export const GALLERY_PAGE_SIZE = 12;

export interface AlbumListParams {
  page?: number;
  tagId?: number;
}

// 앨범 목록(회원전용, GALLERY_VIEW). createdAt,desc 고정. /api/gallery/**는 토큰 필요 → authFetch.
export async function fetchAlbums(params: AlbumListParams): Promise<Page<GalleryAlbumCardResponse>> {
  const qs = buildListQuery({
    page: params.page,
    size: GALLERY_PAGE_SIZE,
    sort: "createdAt,desc",
    tagId: params.tagId,
  });
  const res = await authFetch(`/api/gallery/albums${qs}`);
  return parseJson<Page<GalleryAlbumCardResponse>>(res);
}

// 앨범 상세(회원전용). 사진 목록 포함.
export async function fetchAlbum(id: number): Promise<GalleryAlbumDetailResponse> {
  const res = await authFetch(`/api/gallery/albums/${id}`);
  return parseJson<GalleryAlbumDetailResponse>(res);
}
