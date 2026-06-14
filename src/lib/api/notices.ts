import { apiUrl } from "@/lib/auth/apiBase";
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

// 어드민 쓰기(createNotice·updateNotice·patchNotice·deleteNotice + 타입)는
// notices.admin.ts에서 제공. 서버 컴포넌트가 이 파일을 import할 때
// authFetch·authStore(useSyncExternalStore) 체인이 서버 번들에 포함되지 않도록 분리.
export type {
  NoticeCreateRequest,
  NoticeUpdateRequest,
  NoticePatchRequest,
} from "./notices.admin";
