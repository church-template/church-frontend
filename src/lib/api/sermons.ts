import { apiUrl } from "@/lib/auth/apiBase";
import type { Page } from "@/lib/page";
import type { SermonCardResponse, SermonDetailResponse } from "./types";

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

// 목록(공개) — 캐시 가능(revalidate 60). tags 부착으로 updateTag("sermons") 즉시 무효화 연결.
export async function getSermons(
  p: SermonListParams = {},
): Promise<Page<SermonCardResponse>> {
  const res = await fetch(apiUrl(`/api/sermons${buildSermonQuery(p)}`), {
    next: { revalidate: 60, tags: ["sermons"] },
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

// 어드민 쓰기(createSermon·updateSermon·patchSermon·deleteSermon + 타입)는
// sermons.admin.ts에서 제공. 서버 컴포넌트가 이 파일을 import할 때
// authFetch·authStore(useSyncExternalStore) 체인이 서버 번들에 포함되지 않도록 분리.
export type {
  SermonCreateRequest,
  SermonUpdateRequest,
  SermonPatchRequest,
} from "./sermons.admin";
