import { apiUrl } from "@/lib/auth/apiBase";
import { apiMutate } from "@/lib/admin/apiMutate";
import type { Page } from "@/lib/page";
import type { NoticeCardResponse, NoticeDetailResponse } from "./types";

// 공지 목록 필터(가이드 10장). q는 제목만 매칭. 설교보다 단순(preacher/series/from/to 없음).
export interface NoticeListParams {
  page?: number;
  size?: number;
  sort?: string; // 미지정 시 백엔드 기본 isPinned,createdAt desc(고정 우선)
  tagId?: number;
  q?: string;
}

export function buildNoticeQuery(p: NoticeListParams): string {
  const sp = new URLSearchParams();
  if (p.page != null) sp.set("page", String(p.page));
  if (p.size != null) sp.set("size", String(p.size));
  if (p.sort) sp.set("sort", p.sort);
  if (p.tagId != null) sp.set("tagId", String(p.tagId));
  if (p.q) sp.set("q", p.q);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// 목록(공개) — 캐시 가능(revalidate 60). 서버 컴포넌트 전용. 정렬은 서버 신뢰(재정렬 금지).
export async function getNotices(
  p: NoticeListParams = {},
): Promise<Page<NoticeCardResponse>> {
  const res = await fetch(apiUrl(`/api/notices${buildNoticeQuery(p)}`), {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`GET /api/notices 실패: ${res.status}`);
  return (await res.json()) as Page<NoticeCardResponse>;
}

// 상세(공개) — GET마다 조회수+1(부수효과) → no-store. 404는 null(호출부가 notFound).
export async function getNotice(
  id: number,
): Promise<NoticeDetailResponse | null> {
  const res = await fetch(apiUrl(`/api/notices/${id}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /api/notices/${id} 실패: ${res.status}`);
  return (await res.json()) as NoticeDetailResponse;
}

// ── 어드민 쓰기(도메인-로컬 타입, 철칙 2). 수정 타입에 낙관락 version 포함. ──
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
