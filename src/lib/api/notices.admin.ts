// 공지 어드민 쓰기 전용 모듈(클라이언트 컴포넌트에서만 호출).
// 공개 읽기(getNotice·getNotices)는 notices.ts에 있으며 서버 컴포넌트가 사용.
// 이 파일을 서버 컴포넌트에서 직접 import하면 authFetch·authStore 체인이 서버 번들에 포함되어 오류.
import { apiMutate } from "@/lib/admin/apiMutate";
import type { NoticeDetailResponse } from "./types";

// ── 어드민 쓰기 요청 타입(도메인-로컬, 철칙 2). 수정 타입에 낙관락 version 포함. ──
export interface NoticeCreateRequest {
  title: string;
  content?: string;
  isPinned?: boolean;
  tagIds?: number[];
}
export interface NoticeUpdateRequest {
  title: string;
  version: number;
  content?: string;
  isPinned?: boolean;
  tagIds?: number[];
}
export interface NoticePatchRequest {
  version: number;
  title?: string;
  content?: string;
  isPinned?: boolean;
  tagIds?: number[];
}

export function createNotice(body: NoticeCreateRequest): Promise<NoticeDetailResponse> {
  return apiMutate<NoticeDetailResponse>("/api/admin/notices", { method: "POST", body });
}
export function updateNotice(id: number, body: NoticeUpdateRequest): Promise<NoticeDetailResponse> {
  return apiMutate<NoticeDetailResponse>(`/api/admin/notices/${id}`, { method: "PUT", body });
}
export function patchNotice(id: number, body: NoticePatchRequest): Promise<NoticeDetailResponse> {
  return apiMutate<NoticeDetailResponse>(`/api/admin/notices/${id}`, { method: "PATCH", body });
}
export function deleteNotice(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/notices/${id}`, { method: "DELETE" });
}
