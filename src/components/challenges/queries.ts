"use client";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  fetchChallenges, fetchChallenge, fetchMyProgress, fetchMyLogs, fetchMyParticipations,
  joinChallenge, recordRead, cancelRead,
} from "@/lib/api/challenges";
import type { MyProgressResponse } from "@/lib/api/types";

// 게이트 통과 후에만 마운트(게이트가 통제). retry:false — 401 재시도는 authFetch 전담(갤러리 컨벤션).
export function useChallenges(params: { page?: number }) {
  return useQuery({
    queryKey: ["challenges", params],
    queryFn: () => fetchChallenges(params),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useChallenge(id: number) {
  return useQuery({ queryKey: ["challenge", id], queryFn: () => fetchChallenge(id), retry: false });
}

// joined일 때만 호출(미참여 404 방지 — 스펙 §3). 자정 경계는 refetchOnWindowFocus(기본값)로 자연 갱신.
export function useMyProgress(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["challenge", id, "progress"],
    queryFn: () => fetchMyProgress(id),
    enabled,
    retry: false,
  });
}

// month = 표시 중인 월의 {from,to}(YYYY-MM-DD) — 월별 캐시(스펙 §3·§4).
export function useMyLogs(id: number, month: { from: string; to: string }, enabled: boolean) {
  return useQuery({
    queryKey: ["challenge", id, "logs", month],
    queryFn: () => fetchMyLogs(id, month),
    enabled,
    retry: false,
  });
}

export function useMyParticipations(page: number, enabled = true) {
  return useQuery({
    queryKey: ["my-participations", page],
    queryFn: () => fetchMyParticipations({ page }),
    placeholderData: keepPreviousData,
    enabled,
    retry: false,
  });
}

// 쓰기 3종 공통 onSuccess: 응답이 완전한 대시보드라 progress는 setQueryData(재요청 0),
// 달력·joined 플래그·마이페이지 숫자만 invalidate(스펙 §1·§3). 낙관적 업데이트 안 씀.
function useProgressMutation<TVars>(id: number, fn: (vars: TVars) => Promise<MyProgressResponse>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (progress) => {
      qc.setQueryData(["challenge", id, "progress"], progress);
      qc.invalidateQueries({ queryKey: ["challenge", id, "logs"] });
      qc.invalidateQueries({ queryKey: ["challenge", id], exact: true });
      qc.invalidateQueries({ queryKey: ["my-participations"] });
    },
  });
}

export function useJoinChallenge(id: number) {
  return useProgressMutation<void>(id, () => joinChallenge(id));
}

export function useRecordRead(id: number) {
  return useProgressMutation<{ chapters?: number; date?: string }>(id, (body) => recordRead(id, body));
}

export function useCancelRead(id: number) {
  return useProgressMutation<{ date?: string }>(id, ({ date }) => cancelRead(id, date));
}
