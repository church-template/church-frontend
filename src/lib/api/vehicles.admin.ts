// 어드민 차량운행(VEHICLE_MANAGE). client 컴포넌트 전용(authFetch/apiMutate 체인 → RSC 번들 금지).
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import { apiMutate } from "@/lib/admin/apiMutate";
import { buildListQuery, type Page } from "@/lib/page";
import type { VehicleRunDetailResponse, VehicleRosterEntryResponse } from "./types";

export const VEHICLE_ADMIN_PAGE_SIZE = 10;
export const VEHICLE_ROSTER_PAGE_SIZE = 20; // 명단은 훑는 화면 — 넉넉히

// 정렬은 백엔드 기본(departsAt,desc — 지난 운행 포함 최신 출발순)에 맡긴다.
export async function fetchAdminVehicleRuns(params: { page?: number }): Promise<Page<VehicleRunDetailResponse>> {
  const qs = buildListQuery({ page: params.page, size: VEHICLE_ADMIN_PAGE_SIZE });
  return parseJson(await authFetch(`/api/admin/vehicle-runs${qs}`));
}

// 명단(백엔드 기본 createdAt,asc — 신청순). 연락처=개인정보라 조회부터 VEHICLE_MANAGE.
export async function fetchVehicleRoster(
  runId: number,
  params: { page?: number },
): Promise<Page<VehicleRosterEntryResponse>> {
  const qs = buildListQuery({ page: params.page, size: VEHICLE_ROSTER_PAGE_SIZE });
  return parseJson(await authFetch(`/api/admin/vehicle-runs/${runId}/requests${qs}`));
}

// 요청 타입은 도메인-로컬(types.ts 규약 — 어드민 쓰기 타입은 공유 파일 금지).
export interface VehicleRunCreateRequest {
  departsAt: string; // offset 없는 LocalDateTime — toServerDateTime 산출값
  note?: string;
}
export interface VehicleRunPatchRequest {
  departsAt?: string;
  note?: string;
  version: number; // 낙관락 필수
}

export function createVehicleRun(body: VehicleRunCreateRequest): Promise<VehicleRunDetailResponse> {
  return apiMutate<VehicleRunDetailResponse>("/api/admin/vehicle-runs", { method: "POST", body });
}
export function patchVehicleRun(id: number, body: VehicleRunPatchRequest): Promise<VehicleRunDetailResponse> {
  return apiMutate<VehicleRunDetailResponse>(`/api/admin/vehicle-runs/${id}`, { method: "PATCH", body });
}
export function deleteVehicleRun(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/vehicle-runs/${id}`, { method: "DELETE" });
}
