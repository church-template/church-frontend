// 설교 어드민 쓰기 전용 모듈(클라이언트 컴포넌트에서만 호출).
// 공개 읽기(getSermon·getSermons)는 sermons.ts에 있으며 서버 컴포넌트가 사용.
// 이 파일을 서버 컴포넌트에서 직접 import하면 authFetch·authStore 체인이 서버 번들에 포함되어 오류.
import { apiMutate } from "@/lib/admin/apiMutate";
import type { SermonDetailResponse } from "./types";

// ── 어드민 쓰기 요청 타입(도메인-로컬, 철칙 2). 수정 타입에 낙관락 version 포함. ──
export interface SermonCreateRequest {
  title: string;
  preacher: string;
  preachedAt: string; // yyyy-MM-dd
  series?: string;
  scripture?: string;
  content?: string; // 마크다운, media:{id}
  videoUrl?: string;
  audioUrl?: string;
  tagIds?: number[];
}
export interface SermonUpdateRequest extends SermonCreateRequest {
  version: number;
}
export interface SermonPatchRequest {
  version: number;
  title?: string;
  preacher?: string;
  preachedAt?: string;
  series?: string;
  scripture?: string;
  content?: string;
  videoUrl?: string;
  audioUrl?: string;
  tagIds?: number[];
}

export function createSermon(body: SermonCreateRequest): Promise<SermonDetailResponse> {
  return apiMutate<SermonDetailResponse>("/api/admin/sermons", { method: "POST", body });
}
export function updateSermon(id: number, body: SermonUpdateRequest): Promise<SermonDetailResponse> {
  return apiMutate<SermonDetailResponse>(`/api/admin/sermons/${id}`, { method: "PUT", body });
}
export function patchSermon(id: number, body: SermonPatchRequest): Promise<SermonDetailResponse> {
  return apiMutate<SermonDetailResponse>(`/api/admin/sermons/${id}`, { method: "PATCH", body });
}
export function deleteSermon(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/sermons/${id}`, { method: "DELETE" });
}
