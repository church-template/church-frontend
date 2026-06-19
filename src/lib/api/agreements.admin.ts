// src/lib/api/agreements.admin.ts
// 어드민 약관 재동의 사이클 API. client 전용. 전역(전체 회원) 플래그 일괄 초기화.
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";

export type AgreementTarget = "terms" | "privacy";

// 전체 회원의 지정 동의 항목을 false로 초기화(200, 본문 없음) → 다음 로그인 시 재동의 유도.
// 200 빈 본문이라 apiMutate(parseJson 경유)를 쓰지 않는다 — 2xx면 본문 파싱 생략, 비-2xx만 ApiError로.
export async function resetAgreements(target: AgreementTarget): Promise<void> {
  const res = await authFetch("/api/admin/agreements/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target }),
  });
  if (!res.ok) await parseJson<void>(res);
}
