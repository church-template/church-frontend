// 어드민 회원 관리 API. client 컴포넌트 전용(authFetch/apiMutate 체인 → RSC 번들 금지).
// ⚠️ 읽기는 admin 미접두(/api/members*), 쓰기는 /api/admin/members* — 경로 비대칭(스펙 §1 사실 #7).
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import { apiMutate } from "@/lib/admin/apiMutate";
import type { Page } from "@/lib/page";

export interface MemberCardResponse {
  uuid: string;
  name: string;
  phone: string;
  position: string;
  roles: string[];
  approved: boolean;
  createdAt: string;
}
export interface MemberDetailResponse {
  uuid: string;
  name: string;
  phone: string;
  email: string;
  position: string;
  roles: string[];
  permissions: string[];
  approved: boolean;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  agreedAt: string | null; // @JsonInclude(NON_NULL) — 미동의 시 누락 가능
  createdAt: string;
}
export interface AdminMemberUpdateRequest { name?: string; phone?: string; email?: string }
export interface MemberListParams { q?: string; page?: number; size?: number; sort?: string }
export interface ResetPasswordResponse { temporaryPassword: string }

function buildMemberQuery(p: MemberListParams): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.page != null) sp.set("page", String(p.page));
  if (p.size != null) sp.set("size", String(p.size));
  if (p.sort) sp.set("sort", p.sort);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// 읽기 — admin 미접두 /api/members*
export async function listMembers(p: MemberListParams = {}): Promise<Page<MemberCardResponse>> {
  const res = await authFetch(`/api/members${buildMemberQuery(p)}`);
  return parseJson<Page<MemberCardResponse>>(res);
}
export async function getMember(uuid: string): Promise<MemberDetailResponse> {
  const res = await authFetch(`/api/members/${uuid}`);
  return parseJson<MemberDetailResponse>(res);
}

// 쓰기 — /api/admin/members*
export function updateMember(uuid: string, body: AdminMemberUpdateRequest): Promise<MemberDetailResponse> {
  return apiMutate<MemberDetailResponse>(`/api/admin/members/${uuid}`, { method: "PATCH", body });
}
export function grantRole(uuid: string, roleId: number): Promise<MemberDetailResponse> {
  return apiMutate<MemberDetailResponse>(`/api/admin/members/${uuid}/roles`, { method: "POST", body: { roleId } });
}
export function revokeRole(uuid: string, roleId: number): Promise<void> {
  return apiMutate<void>(`/api/admin/members/${uuid}/roles/${roleId}`, { method: "DELETE" });
}
export function resetPassword(uuid: string): Promise<ResetPasswordResponse> {
  // 본문 없는 POST. apiMutate는 body undefined면 JSON.stringify 생략(Content-Type만 부착).
  return apiMutate<ResetPasswordResponse>(`/api/admin/members/${uuid}/reset-password`, { method: "POST" });
}
export function changePosition(uuid: string, positionId: number | null): Promise<MemberDetailResponse> {
  // 직분 부여/변경/해제 — PUT .../position. positionId=null이면 해제(스펙: 위계 검증 없음).
  return apiMutate<MemberDetailResponse>(`/api/admin/members/${uuid}/position`, { method: "PUT", body: { positionId } });
}
