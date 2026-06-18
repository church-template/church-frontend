// 어드민 태그 쓰기. client 컴포넌트에서만 호출(authFetch·authStore 체인이 서버 번들에 들어가면 빌드 오류).
import { apiMutate } from "@/lib/admin/apiMutate";
import type { TagResponse } from "./types";

export interface TagCreateRequest { name: string } // ≤50
export interface TagUpdateRequest { name: string } // ≤50, version 없음. PATCH지만 프론트는 항상 name 전송(폼 ≥1 강제)

export function createTag(body: TagCreateRequest): Promise<TagResponse> {
  return apiMutate<TagResponse>("/api/admin/tags", { method: "POST", body });
}
export function patchTag(id: number, body: TagUpdateRequest): Promise<TagResponse> {
  return apiMutate<TagResponse>(`/api/admin/tags/${id}`, { method: "PATCH", body });
}
export function deleteTag(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/tags/${id}`, { method: "DELETE" });
}
