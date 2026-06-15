// src/lib/api/bulletins.admin.ts
// 어드민 주보 쓰기. client 전용(RSC 번들 경계). 통합 업로드 모델 → mediaId만 전송(쿼리파라미터).
import { apiUpload } from "@/lib/admin/apiUpload";
import { apiMutate } from "@/lib/admin/apiMutate";
import type { BulletinDetailResponse } from "./types";

// 도메인-로컬 요청 타입(철칙 2). serviceDate=yyyy-MM-dd. file XOR mediaId는 항상 mediaId.
export interface BulletinCreateInput {
  title: string;
  serviceDate: string;
  mediaId: number;
}
export interface BulletinUpdateInput {
  version: number; // 낙관락 — 쿼리로 전송(가이드 8장, 스펙 §3.3)
  title?: string;
  serviceDate?: string;
  mediaId?: number;
}

export function createBulletin(input: BulletinCreateInput): Promise<BulletinDetailResponse> {
  return apiUpload<BulletinDetailResponse>("/api/admin/bulletins", {
    method: "POST",
    query: { title: input.title, serviceDate: input.serviceDate, mediaId: input.mediaId },
  });
}
export function patchBulletin(id: number, input: BulletinUpdateInput): Promise<BulletinDetailResponse> {
  return apiUpload<BulletinDetailResponse>(`/api/admin/bulletins/${id}`, {
    method: "PATCH",
    query: { version: input.version, title: input.title, serviceDate: input.serviceDate, mediaId: input.mediaId },
  });
}
export function deleteBulletin(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/bulletins/${id}`, { method: "DELETE" });
}
