// 성경통독 챌린지 — 전 엔드포인트 회원전용(CHALLENGE_PARTICIPATE) → authFetch만 사용(갤러리 패턴).
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import { buildListQuery, type Page } from "@/lib/page";
import type {
  ChallengeCardResponse, ChallengeDetailResponse, MyProgressResponse,
  ReadingLogResponse, MyParticipationResponse,
} from "./types";

export const CHALLENGE_PAGE_SIZE = 12;

export async function fetchChallenges(params: { page?: number }): Promise<Page<ChallengeCardResponse>> {
  const qs = buildListQuery({ page: params.page, size: CHALLENGE_PAGE_SIZE, sort: "startDate,desc" });
  return parseJson(await authFetch(`/api/bible-challenges${qs}`));
}

export async function fetchChallenge(id: number): Promise<ChallengeDetailResponse> {
  return parseJson(await authFetch(`/api/bible-challenges/${id}`));
}

export async function fetchMyProgress(id: number): Promise<MyProgressResponse> {
  return parseJson(await authFetch(`/api/bible-challenges/${id}/my-progress`));
}

// from/to 생략 시 챌린지 기간 전체(백엔드 기본). 달력은 표시 월 범위로 호출.
export async function fetchMyLogs(id: number, range?: { from?: string; to?: string }): Promise<ReadingLogResponse[]> {
  const sp = new URLSearchParams();
  if (range?.from) sp.set("from", range.from);
  if (range?.to) sp.set("to", range.to);
  const qs = sp.toString();
  return parseJson(await authFetch(`/api/bible-challenges/${id}/my-logs${qs ? `?${qs}` : ""}`));
}

export async function fetchMyParticipations(
  params: { page?: number; size?: number },
): Promise<Page<MyParticipationResponse>> {
  const qs = buildListQuery({ page: params.page, size: params.size ?? CHALLENGE_PAGE_SIZE });
  return parseJson(await authFetch(`/api/bible-challenges/my-participations${qs}`));
}

// 쓰기 3종 — 모두 갱신된 MyProgressResponse 반환(setQueryData로 즉시 반영, 스펙 §1).
export async function joinChallenge(id: number): Promise<MyProgressResponse> {
  return parseJson(await authFetch(`/api/bible-challenges/${id}/join`, { method: "POST" }));
}

// chapters 생략 = 그날 남은 목표치(서버 기본값), date 생략 = 오늘(서버 KST).
export async function recordRead(
  id: number,
  body: { chapters?: number; date?: string },
): Promise<MyProgressResponse> {
  const payload: Record<string, unknown> = {};
  if (body.chapters != null) payload.chapters = body.chapters;
  if (body.date != null) payload.date = body.date;
  return parseJson(
    await authFetch(`/api/bible-challenges/${id}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function cancelRead(id: number, date?: string): Promise<MyProgressResponse> {
  const qs = date ? `?date=${date}` : "";
  return parseJson(await authFetch(`/api/bible-challenges/${id}/read${qs}`, { method: "DELETE" }));
}
