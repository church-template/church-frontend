// src/lib/api/media.admin.ts
// 어드민 미디어 라이브러리 API. client 컴포넌트 전용(authFetch·authStore 체인 → RSC 번들 금지).
import { authFetch } from "@/lib/auth/authFetch";
import { apiMutate } from "@/lib/admin/apiMutate";
import { apiUpload } from "@/lib/admin/apiUpload";
import { parseJson, type MediaReference } from "@/lib/auth/apiError";
import type { Page } from "@/lib/page";

// 어드민 응답 타입(공개 GET 없음 → 도메인-로컬). 필드는 OpenAPI MediaResponse와 일치(스펙 §3.1).
export interface MediaResponse {
  id: number;
  filename: string;
  mimeType: string;
  size: number; // bytes
  uploadedBy: number;
  createdAt: string; // LocalDateTime
}
// 참조 항목은 기존 MediaReference({type,id,title}) 재사용 — 409 백스톱과 동일 타입.
export interface MediaReferencesResponse {
  mediaId: number;
  inUse: boolean;
  references: MediaReference[];
}
export interface MediaListParams {
  type?: "image" | "pdf";
  from?: string; // yyyy-MM-dd
  to?: string; // yyyy-MM-dd
  page?: number;
  size?: number;
  sort?: string;
}

function buildMediaQuery(p: MediaListParams): string {
  const sp = new URLSearchParams();
  if (p.type) sp.set("type", p.type);
  if (p.from) sp.set("from", p.from);
  if (p.to) sp.set("to", p.to);
  if (p.page != null) sp.set("page", String(p.page));
  if (p.size != null) sp.set("size", String(p.size));
  if (p.sort) sp.set("sort", p.sort);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function listMedia(p: MediaListParams = {}): Promise<Page<MediaResponse>> {
  const res = await authFetch(`/api/admin/media${buildMediaQuery(p)}`);
  return parseJson<Page<MediaResponse>>(res);
}
// 통합 업로드 모델의 유일한 멀티파트 호출. 사전검증은 MediaUploader가 전담(여기는 전송만).
export function uploadMedia(file: File): Promise<MediaResponse> {
  const fd = new FormData();
  fd.append("file", file);
  return apiUpload<MediaResponse>("/api/admin/media", { method: "POST", formData: fd });
}
export async function getMediaReferences(id: number): Promise<MediaReferencesResponse> {
  const res = await authFetch(`/api/admin/media/${id}/references`);
  return parseJson<MediaReferencesResponse>(res);
}
export function deleteMedia(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/media/${id}`, { method: "DELETE" });
}
