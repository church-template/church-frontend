import { apiUrl } from "@/lib/auth/apiBase";
import { buildListQuery, type ListQuery, type Page } from "@/lib/page";
import type { BulletinCardResponse } from "./types";

// 주보 목록 파라미터 — 필터 없음(가이드 10장). 공용 ListQuery에서 tagId만 타입으로 차단.
// sort 미지정 시 백엔드 기본 serviceDate,desc(예배일 내림차순).
export type BulletinListParams = Omit<ListQuery, "tagId">;

// 목록(공개) — 캐시 가능(revalidate 60). 서버 컴포넌트 전용. 정렬은 서버 신뢰(재정렬 금지).
// 주보는 조회수 부수효과가 없어 상세도 캐시 가능하지만, 상세 fetch 자체가 불필요(스펙 D2).
export async function getBulletins(
  p: BulletinListParams = {},
): Promise<Page<BulletinCardResponse>> {
  const res = await fetch(apiUrl(`/api/bulletins${buildListQuery(p)}`), {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`GET /api/bulletins 실패: ${res.status}`);
  return (await res.json()) as Page<BulletinCardResponse>;
}
