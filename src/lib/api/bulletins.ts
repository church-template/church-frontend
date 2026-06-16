import { apiUrl } from "@/lib/auth/apiBase";
import { buildListQuery, type ListQuery, type Page } from "@/lib/page";
import type { BulletinCardResponse, BulletinDetailResponse } from "./types";

export type BulletinListParams = Omit<ListQuery, "tagId">;

// 목록(공개) — 캐시 가능(revalidate 60). tags 부착으로 updateTag("bulletins") 즉시 무효화 연결.
export async function getBulletins(p: BulletinListParams = {}): Promise<Page<BulletinCardResponse>> {
  const res = await fetch(apiUrl(`/api/bulletins${buildListQuery(p)}`), {
    next: { revalidate: 60, tags: ["bulletins"] },
  });
  if (!res.ok) throw new Error(`GET /api/bulletins 실패: ${res.status}`);
  return (await res.json()) as Page<BulletinCardResponse>;
}

// 상세(공개) — 어드민 수정 폼이 최신 version을 시드하기 위해 no-store(캐시 시 stale version → 즉시 409).
export async function getBulletin(id: number): Promise<BulletinDetailResponse> {
  const res = await fetch(apiUrl(`/api/bulletins/${id}`), { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /api/bulletins/${id} 실패: ${res.status}`);
  return (await res.json()) as BulletinDetailResponse;
}
