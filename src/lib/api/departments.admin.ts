// 어드민 부서 쓰기·읽기. 이 파일을 서버 컴포넌트에서 직접 import하면 authFetch·authStore 체인이
// 서버 번들에 포함되어 빌드 오류가 난다 — client 컴포넌트에서만 호출한다(RSC 번들 경계).
// 어드민 전용 GET이 없어 읽기는 공개 엔드포인트를 fresh(no-store)로 호출(read-your-writes).
import { apiMutate } from "@/lib/admin/apiMutate";
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import type { DepartmentCardResponse, DepartmentDetailResponse } from "./types";

// 어드민 부서 쓰기 요청 타입(도메인-로컬). 공유 types.ts가 아닌 여기에 둔다(병렬화 스펙).
export interface DepartmentCreateRequest {
  name: string; // 필수, ≤100
  description?: string; // ≤50000(마크다운)
  leader?: string; // ≤100
  parentId?: number | null; // null = 루트
  sortOrder?: number; // 생략 시 백엔드 max+10
}
export interface DepartmentUpdateRequest extends DepartmentCreateRequest {
  version: number; // 낙관락. parentId=null=루트화, sortOrder 생략=기존 유지(PUT 시맨틱)
}

export async function listDepartmentsAdmin(): Promise<DepartmentCardResponse[]> {
  const res = await authFetch("/api/departments", { cache: "no-store" });
  return (await parseJson<DepartmentCardResponse[] | null>(res)) ?? [];
}
export async function getDepartmentDetail(id: number): Promise<DepartmentDetailResponse> {
  const res = await authFetch(`/api/departments/${id}`, { cache: "no-store" });
  return parseJson<DepartmentDetailResponse>(res);
}

// 쓰기 — apiMutate(200/201/204 자동 처리, 비2xx→ApiError).
export function createDepartment(body: DepartmentCreateRequest): Promise<DepartmentDetailResponse> {
  return apiMutate<DepartmentDetailResponse>("/api/admin/departments", { method: "POST", body });
}
export function updateDepartment(id: number, body: DepartmentUpdateRequest): Promise<DepartmentDetailResponse> {
  return apiMutate<DepartmentDetailResponse>(`/api/admin/departments/${id}`, { method: "PUT", body });
}
export function deleteDepartment(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/departments/${id}`, { method: "DELETE" });
}
