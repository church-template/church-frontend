import type { RoleResponse } from "@/lib/api/roles.admin";

// 회원 역할 부여/회수 가드: 대상 역할 우선순위가 내 최대 등급보다 '엄격히 낮을' 때만(동급 차단).
// 백엔드 validateGrantable과 일치(ADMIN은 동급 ADMIN 위임/회수 불가, SUPER_ADMIN만 가능).
// isSystem은 제외하지 않는다 — MEMBER(시스템 역할) 부여가 곧 교인 승인이므로.
// 07A canManageRole(!isSystem && priority<=max, 역할 정의 편집용)과 의도·부등호가 다르다 → 재사용 금지.
export function canAssignRole(role: RoleResponse, maxPriority: number): boolean {
  return role.priority < maxPriority;
}
