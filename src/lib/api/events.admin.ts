// 어드민 일정 쓰기. 이 파일을 서버 컴포넌트에서 직접 import하면 authFetch·authStore 체인이
// 서버 번들에 포함되어 빌드 오류가 난다 — client 컴포넌트에서만 호출한다(RSC 번들 경계).
import { apiMutate } from "@/lib/admin/apiMutate";
import type { EventDetailResponse } from "./types";

// ── 어드민 쓰기 요청 타입(도메인-로컬, 철칙 2). 수정 타입에 낙관락 version 포함. ──
export interface EventCreateRequest {
  title: string; // 필수, ≤200
  startAt: string; // 필수, LocalDateTime(offset 없음)
  description?: string; // 마크다운, ≤50000
  location?: string; // ≤200
  endAt?: string; // 없으면 점 이벤트
  allDay?: boolean;
  tagIds?: number[];
}
export interface EventUpdateRequest extends EventCreateRequest {
  version: number; // 낙관락
}

export function createEvent(body: EventCreateRequest): Promise<EventDetailResponse> {
  return apiMutate<EventDetailResponse>("/api/admin/events", { method: "POST", body });
}
export function updateEvent(id: number, body: EventUpdateRequest): Promise<EventDetailResponse> {
  return apiMutate<EventDetailResponse>(`/api/admin/events/${id}`, { method: "PUT", body });
}
export function deleteEvent(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/events/${id}`, { method: "DELETE" });
}
