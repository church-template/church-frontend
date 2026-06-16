// src/lib/api/gallery.admin.ts
// 어드민 갤러리 쓰기. client 전용(RSC 번들 경계). 앨범 메타는 JSON, 사진 추가는 쿼리(mediaIds, 통합 업로드 모델).
import { apiMutate } from "@/lib/admin/apiMutate";
import { apiUpload } from "@/lib/admin/apiUpload";
import type { GalleryAlbumDetailResponse } from "./types";

export interface GalleryAlbumCreateRequest {
  title: string;
  description?: string;
  tagIds?: number[];
}
export interface GalleryAlbumPatchRequest {
  title?: string;
  description?: string;
  tagIds?: number[];
  version: number; // 낙관락 — body(가이드 8장, 스펙 §3.2)
}

export function createAlbum(body: GalleryAlbumCreateRequest): Promise<GalleryAlbumDetailResponse> {
  return apiMutate<GalleryAlbumDetailResponse>("/api/admin/gallery/albums", { method: "POST", body });
}
export function patchAlbum(id: number, body: GalleryAlbumPatchRequest): Promise<GalleryAlbumDetailResponse> {
  return apiMutate<GalleryAlbumDetailResponse>(`/api/admin/gallery/albums/${id}`, { method: "PATCH", body });
}
export function deleteAlbum(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/gallery/albums/${id}`, { method: "DELETE" });
}
// 통합 모델 → mediaIds만 쿼리로 전송. (Phase 0 Step2에서 mediaIds-only 200 검증; 400이면 폴백 필요)
export function addPhotos(albumId: number, mediaIds: number[]): Promise<GalleryAlbumDetailResponse> {
  return apiUpload<GalleryAlbumDetailResponse>(`/api/admin/gallery/albums/${albumId}/photos`, {
    method: "POST",
    query: { mediaIds },
  });
}
export function removePhoto(photoId: number): Promise<void> {
  return apiMutate<void>(`/api/admin/gallery/photos/${photoId}`, { method: "DELETE" });
}
