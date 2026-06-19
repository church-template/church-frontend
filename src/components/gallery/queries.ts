"use client";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getTags } from "@/lib/api/tags";
import { fetchAlbums, fetchAlbum, type AlbumListParams } from "@/lib/api/gallery";

// 게이트 통과 후에만 마운트되므로 별도 enabled 게이팅은 불필요(게이트가 통제).
// retry:false — 401 refresh·재시도는 authFetch가 처리(이중 재시도 방지).
export function useAlbums(params: AlbumListParams) {
  return useQuery({
    queryKey: ["albums", params],
    queryFn: () => fetchAlbums(params),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useAlbum(id: number) {
  return useQuery({
    queryKey: ["album", id],
    queryFn: () => fetchAlbum(id),
    retry: false,
  });
}

// /api/tags는 공개(가이드 2.3·6.1) — 기존 getTags(plain fetch) 재사용(토큰 미부착). TagFilter용.
export function useGalleryTags() {
  return useQuery({ queryKey: ["tags"], queryFn: getTags, retry: false });
}
