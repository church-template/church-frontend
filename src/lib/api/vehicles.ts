// 차량운행 — 전 엔드포인트 회원전용(VEHICLE_APPLY) → authFetch만 사용(챌린지·갤러리 패턴).
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import { buildListQuery, type Page } from "@/lib/page";
import type { VehicleRunCardResponse, VehicleRequestResponse } from "./types";

export const VEHICLE_RUN_PAGE_SIZE = 10;

// 정렬은 백엔드 기본(departsAt,asc — 출발 임박순)에 맡긴다. 다가오는 운행일만 온다.
export async function fetchVehicleRuns(params: { page?: number }): Promise<Page<VehicleRunCardResponse>> {
  const qs = buildListQuery({ page: params.page, size: VEHICLE_RUN_PAGE_SIZE });
  return parseJson(await authFetch(`/api/vehicle-runs${qs}`));
}

// 요청 타입은 도메인-로컬(types.ts 규약 — 쓰기 요청 타입은 공유 파일에 두지 않는다).
// 주의: 백엔드 스키마의 pickupOrCoordinatesPresent 등 @AssertTrue 게터는 실제 필드가 아니므로 넣지 않는다.
export interface VehicleRequestCreateRequest {
  pickupLocation?: string; // ≤200, 선택(좌표만 신청 가능)
  note?: string; // 동승 인원·특이사항
  latitude?: number; // 현재 위치 첨부(좌표는 동반 필수 — 백엔드 검증)
  longitude?: number;
}

export async function applyVehicleRequest(
  runId: number,
  body: VehicleRequestCreateRequest,
): Promise<VehicleRequestResponse> {
  return parseJson(
    await authFetch(`/api/vehicle-runs/${runId}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

// 204 No Content — parseJson은 빈 본문에 throw하므로 상태 확인 후 비-2xx만 파싱(ApiError 승격).
export async function cancelVehicleRequest(runId: number): Promise<void> {
  const res = await authFetch(`/api/vehicle-runs/${runId}/requests/me`, { method: "DELETE" });
  if (res.status !== 204) await parseJson(res);
}
