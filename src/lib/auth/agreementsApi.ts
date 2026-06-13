import { authFetch } from "./authFetch";
import { parseJson } from "./apiError";
import type { AgreementResponse, AgreementUpdateRequest } from "./types";

// 약관 재동의(가이드 9장) — 회원 영역이므로 authFetch(401 INVALID_TOKEN refresh는 T5가 처리).
export async function getMyAgreements(): Promise<AgreementResponse> {
  const res = await authFetch("/api/members/me/agreements");
  return parseJson<AgreementResponse>(res);
}

export async function updateMyAgreements(req: AgreementUpdateRequest): Promise<AgreementResponse> {
  const res = await authFetch("/api/members/me/agreements", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return parseJson<AgreementResponse>(res);
}
