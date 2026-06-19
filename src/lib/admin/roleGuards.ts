import type { RoleResponse } from "@/lib/api/roles.admin";

// 편집·삭제·권한설정 가드: 시스템 역할 아님 && 대상 우선순위 ≤ 내 최대 등급(같은 등급 허용).
// 서버가 동일 조건으로 최종 방어(403) — 이건 버튼 선제 비활성용 UX 가드(가이드 2.1).
// 주의: 회원 '역할 부여/회수'(07B)에는 재사용 금지 — 부여는 isSystem을 막지 않고,
// MEMBER(시스템 역할) 부여가 곧 교인 승인이라 isSystem 제외 시 승인이 막힌다. 07B는 우선순위 단독 판별식을 별도로 둔다.
export function canManageRole(role: RoleResponse, maxPriority: number): boolean {
  return !role.isSystem && role.priority <= maxPriority;
}
