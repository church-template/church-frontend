"use client";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getTags } from "@/lib/api/tags";
import { fetchSermons, fetchSermon, type SermonListParams } from "@/lib/api/sermons";

// 게이트(MemberGate) 통과 후에만 마운트되므로 별도 enabled 게이팅은 불필요(게이트가 통제).
// retry:false — 401 refresh·재시도는 authFetch가 처리(이중 재시도 방지).
export function useSermons(params: SermonListParams) {
  return useQuery({
    queryKey: ["sermons", params],
    queryFn: () => fetchSermons(params),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useSermon(id: number) {
  return useQuery({
    queryKey: ["sermon", id],
    queryFn: () => fetchSermon(id),
    retry: false,
  });
}

// /api/tags는 공개(가이드 2.3·6.1) — 기존 getTags(plain fetch) 재사용(토큰 미부착). TagFilter용.
export function useSermonTags() {
  return useQuery({ queryKey: ["tags"], queryFn: getTags, retry: false });
}
