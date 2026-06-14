import { apiUrl } from "@/lib/auth/apiBase";
import type { Page } from "@/lib/page";
import type { EventCardResponse, EventDetailResponse } from "./types";

// 월 단위 단일 페이지 — 백엔드 기본 size=10 잘림 방지(스펙 §4.1). 매직넘버 금지.
export const EVENTS_PAGE_SIZE = 200;

// year·month는 항상 쌍(반쪽 = 400, 가이드 10장). 타입에서 둘 다 필수라 호출부가 어길 수 없다.
export interface EventListParams {
  year: number;
  month: number;
  tagId?: number;
  size?: number;
}

export function buildEventQuery(p: EventListParams): string {
  const sp = new URLSearchParams();
  sp.set("year", String(p.year));
  sp.set("month", String(p.month));
  sp.set("size", String(p.size ?? EVENTS_PAGE_SIZE));
  if (p.tagId != null) sp.set("tagId", String(p.tagId));
  return `?${sp.toString()}`;
}

// 목록(공개) — 캐시 가능(revalidate 60). tags 부착으로 updateTag("events") 즉시 무효화 연결.
export async function getEvents(p: EventListParams): Promise<Page<EventCardResponse>> {
  const res = await fetch(apiUrl(`/api/events${buildEventQuery(p)}`), {
    next: { revalidate: 60, tags: ["events"] },
  });
  if (!res.ok) throw new Error(`GET /api/events 실패: ${res.status}`);
  return (await res.json()) as Page<EventCardResponse>;
}

// 상세(공개) — viewCount 부수효과 없어 캐시 가능. tags 부착으로 updateTag("events") 무효화.
export async function getEvent(id: number): Promise<EventDetailResponse | null> {
  const res = await fetch(apiUrl(`/api/events/${id}`), { next: { revalidate: 60, tags: ["events"] } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /api/events/${id} 실패: ${res.status}`);
  return (await res.json()) as EventDetailResponse;
}
