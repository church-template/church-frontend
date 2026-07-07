// 어드민 챌린지 쓰기(CHALLENGE_MANAGE). client 컴포넌트에서만 호출(RSC 번들 경계 — authFetch 체인).
// 어드민 전용 GET 없음 — 목록·상세 읽기는 회원 API(challenges.ts) 재사용(스펙 §3).
import { apiMutate } from "@/lib/admin/apiMutate";
import type { ChallengeDetailResponse } from "./types";

// 요청 타입은 도메인-로컬(types.ts 규약 — 어드민 쓰기 타입은 공유 파일 금지).
export interface ChallengeCreateRequest {
  title: string; // ≤100
  description?: string; // ≤50000, raw 마크다운
  startBook: number; // 1~66
  endBook: number; // startBook ≤ endBook
  startDate: string; // "YYYY-MM-DD"
  targetDays: number; // 1~3650
}

// PATCH — 보낸 필드만 수정. 참여자 존재 시 범위·기간 필드는 백엔드가 400으로 거부(스펙 §7).
export interface ChallengePatchRequest {
  title?: string;
  description?: string;
  startBook?: number;
  endBook?: number;
  startDate?: string;
  targetDays?: number;
  version: number; // 낙관락 필수
}

export function createChallenge(body: ChallengeCreateRequest): Promise<ChallengeDetailResponse> {
  return apiMutate<ChallengeDetailResponse>("/api/admin/bible-challenges", { method: "POST", body });
}

export function patchChallenge(id: number, body: ChallengePatchRequest): Promise<ChallengeDetailResponse> {
  return apiMutate<ChallengeDetailResponse>(`/api/admin/bible-challenges/${id}`, { method: "PATCH", body });
}

export function deleteChallenge(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/bible-challenges/${id}`, { method: "DELETE" });
}
