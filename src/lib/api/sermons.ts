import { apiUrl } from "@/lib/auth/apiBase";
import type { Page } from "@/lib/page";
import type { SermonCardResponse, SermonDetailResponse } from "./types";
import { apiMutate } from "@/lib/admin/apiMutate";

// 설교 목록 필터(가이드 10장). 공유 buildListQuery는 q/preacher/series/from/to를 안 다루므로 전용 빌더.
export interface SermonListParams {
  page?: number;
  size?: number;
  sort?: string; // 미지정 시 백엔드 기본 preachedAt,desc
  tagId?: number;
  q?: string;
  preacher?: string;
  series?: string;
  from?: string; // yyyy-MM-dd
  to?: string;
}

export function buildSermonQuery(p: SermonListParams): string {
  const sp = new URLSearchParams();
  if (p.page != null) sp.set("page", String(p.page));
  if (p.size != null) sp.set("size", String(p.size));
  if (p.sort) sp.set("sort", p.sort);
  if (p.tagId != null) sp.set("tagId", String(p.tagId));
  if (p.q) sp.set("q", p.q);
  if (p.preacher) sp.set("preacher", p.preacher);
  if (p.series) sp.set("series", p.series);
  if (p.from) sp.set("from", p.from);
  if (p.to) sp.set("to", p.to);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// 목록(공개) — 캐시 가능(revalidate 60). 서버 컴포넌트 전용.
export async function getSermons(
  p: SermonListParams = {},
): Promise<Page<SermonCardResponse>> {
  const res = await fetch(apiUrl(`/api/sermons${buildSermonQuery(p)}`), {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`GET /api/sermons 실패: ${res.status}`);
  return (await res.json()) as Page<SermonCardResponse>;
}

// 상세(공개) — GET마다 조회수+1(부수효과) → no-store. 404는 null(호출부가 notFound).
export async function getSermon(
  id: number,
): Promise<SermonDetailResponse | null> {
  const res = await fetch(apiUrl(`/api/sermons/${id}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /api/sermons/${id} 실패: ${res.status}`);
  return (await res.json()) as SermonDetailResponse;
}

// ── 어드민 쓰기(도메인-로컬 타입, 철칙 2). 수정 타입에 낙관락 version 포함. ──
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
