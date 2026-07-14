// 공개 문의 등록(비인증). authFetch(401 refresh·토큰 큐잉) 체인을 타면 안 되므로 apiMutate를 쓰지 않는다
// — 방문자는 토큰이 없다. 에러 변환(parseJson)만 공유해 errorCode 분기(가이드 4장)에 그대로 얹힌다.
import { apiUrl } from "@/lib/auth/apiBase";
import { parseJson } from "@/lib/auth/apiError";

export interface InquiryCreateRequest {
  name: string; // ≤50
  phone: string; // ≤20
  email?: string; // 선택, ≤100
  content: string; // 10~2000
  privacyAgreed: boolean; // 필수 true
}
// 개인정보는 되돌려주지 않는다 — 접수번호만.
export interface InquiryCreatedResponse {
  id: number;
}

export function createInquiry(body: InquiryCreateRequest): Promise<InquiryCreatedResponse> {
  return fetch(apiUrl("/api/inquiries"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((res) => parseJson<InquiryCreatedResponse>(res));
}
