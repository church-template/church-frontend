// 어드민 역할 읽기·쓰기. client 컴포넌트 전용(authFetch/apiMutate 체인 → RSC 번들 금지).
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import { apiMutate } from "@/lib/admin/apiMutate";
import type { PermissionResponse } from "./permissions.admin";

// 어드민 응답 타입(공개 GET 없음 → 도메인-로컬, media.admin.ts 선례). OpenAPI RoleResponse와 일치.
// version 없음 — 역할은 낙관락·단건 GET 미존재(태그·직분과 동형). 수정·권한 시드는 목록 행 값 사용.
export interface RoleResponse {
  id: number;
  name: string;
  priority: number;
  isSystem: boolean;
  description: string;
  permissions: PermissionResponse[];
}

export interface RoleCreateRequest { name: string; priority: number; description?: string }
// PATCH지만 폼 전체 제출(name·priority 항상 전송). 부분수정 의도 아님.
export interface RoleUpdateRequest { name: string; priority: number; description?: string }

export async function getRoles(): Promise<RoleResponse[]> {
  const res = await authFetch("/api/admin/roles");
  return parseJson<RoleResponse[]>(res); // priority 내림차순 평배열
}
export function createRole(body: RoleCreateRequest): Promise<RoleResponse> {
  return apiMutate<RoleResponse>("/api/admin/roles", { method: "POST", body });
}
export function patchRole(id: number, body: RoleUpdateRequest): Promise<RoleResponse> {
  return apiMutate<RoleResponse>(`/api/admin/roles/${id}`, { method: "PATCH", body });
}
export function deleteRole(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/roles/${id}`, { method: "DELETE" });
}
// 권한 전체 교체(PUT). 권한 '이름' 배열 전송(id 아님), 빈 배열 = 전 권한 회수.
export function setRolePermissions(id: number, names: string[]): Promise<RoleResponse> {
  return apiMutate<RoleResponse>(`/api/admin/roles/${id}/permissions`, { method: "PUT", body: { permissions: names } });
}
