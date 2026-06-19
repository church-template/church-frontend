// 어드민 권한 카탈로그 조회. client 컴포넌트 전용(authFetch 체인 → RSC 번들 금지).
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";

// 어드민 응답 타입(공개 GET 없음 → 도메인-로컬, media.admin.ts 선례). OpenAPI PermissionResponse와 일치.
export interface PermissionResponse {
  id: number;
  name: string; // 코드형 키(예: "ROLE_MANAGE")
  description: string; // 서버 한글 설명(보조)
}

export async function getPermissions(): Promise<PermissionResponse[]> {
  const res = await authFetch("/api/admin/permissions");
  return parseJson<PermissionResponse[]>(res);
}
