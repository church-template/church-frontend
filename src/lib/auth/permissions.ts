import type { MeResponse } from "./types";

// 게이팅은 permissions 문자열 기준(roles·직분 아님, 접두사 없음 — 가이드 2.1).
export function hasPermission(perm: string, me: MeResponse | undefined): boolean {
  return me?.permissions?.includes(perm) ?? false;
}

export function hasAnyPermission(perms: string[], me: MeResponse | undefined): boolean {
  return perms.some((p) => hasPermission(p, me));
}
