import { apiUrl } from "@/lib/auth/apiBase";
import type { TagResponse } from "./types";

// 태그 목록(공개, 비페이징 평배열, 가이드 10장). 변동 적어 revalidate 300. TagFilter용.
export async function getTags(): Promise<TagResponse[]> {
  const res = await fetch(apiUrl("/api/tags"), { next: { revalidate: 300, tags: ["tags"] } });
  if (!res.ok) throw new Error(`GET /api/tags 실패: ${res.status}`);
  return (await res.json()) as TagResponse[];
}
