// 어드민 직분 쓰기. client 컴포넌트 전용(서버 번들 경계).
import { apiMutate } from "@/lib/admin/apiMutate";
import type { PositionResponse } from "./types";

export interface PositionCreateRequest { name: string; sortOrder?: number } // sortOrder 생략 → 백엔드 max+10
export interface PositionUpdateRequest { name: string; sortOrder?: number } // PATCH 부분수정. sortOrder 미포함=미변경

export function createPosition(body: PositionCreateRequest): Promise<PositionResponse> {
  return apiMutate<PositionResponse>("/api/admin/positions", { method: "POST", body });
}
export function patchPosition(id: number, body: PositionUpdateRequest): Promise<PositionResponse> {
  return apiMutate<PositionResponse>(`/api/admin/positions/${id}`, { method: "PATCH", body });
}
export function deletePosition(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/positions/${id}`, { method: "DELETE" });
}
