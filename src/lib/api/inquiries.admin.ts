// 어드민 문의 관리 API. client 컴포넌트 전용(authFetch/apiMutate 체인 → RSC 번들 금지).
// 정렬은 백엔드 기본(createdAt,desc)에 맡긴다 — sort를 보내지 않는다.
import { authFetch } from "@/lib/auth/authFetch";
import { parseJson } from "@/lib/auth/apiError";
import { apiMutate } from "@/lib/admin/apiMutate";
import type { Page } from "@/lib/page";

// 목록 카드 — 문의 내용(content)은 없다. 내용을 읽으려면 상세를 연다.
export interface InquiryCardResponse {
  id: number;
  name: string;
  phone: string;
  email?: string; // @JsonInclude(NON_NULL) — 미입력 시 누락 가능
  completed: boolean;
  completedAt: string | null; // @JsonInclude(NON_NULL) — 미완료 시 누락 가능
  createdAt: string;
}
export interface InquiryDetailResponse extends InquiryCardResponse {
  content: string;
}
export interface InquiryListParams {
  completed?: boolean; // 미지정=전체, false=미처리, true=완료
  page?: number;
  size?: number;
}

function buildInquiryQuery(p: InquiryListParams): string {
  const sp = new URLSearchParams();
  if (p.completed != null) sp.set("completed", String(p.completed));
  if (p.page != null) sp.set("page", String(p.page));
  if (p.size != null) sp.set("size", String(p.size));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// authFetch는 path를 그대로 받는다(내부에서 apiUrl 적용) — members.admin.ts와 동일.
export async function listInquiries(p: InquiryListParams): Promise<Page<InquiryCardResponse>> {
  const res = await authFetch(`/api/admin/inquiries${buildInquiryQuery(p)}`);
  return parseJson<Page<InquiryCardResponse>>(res);
}

export async function getInquiry(id: number): Promise<InquiryDetailResponse> {
  const res = await authFetch(`/api/admin/inquiries/${id}`);
  return parseJson<InquiryDetailResponse>(res);
}

export function completeInquiry(id: number, completed: boolean): Promise<InquiryDetailResponse> {
  return apiMutate<InquiryDetailResponse>(`/api/admin/inquiries/${id}/complete`, {
    method: "PATCH",
    body: { completed },
  });
}

export function deleteInquiry(id: number): Promise<void> {
  return apiMutate<void>(`/api/admin/inquiries/${id}`, { method: "DELETE" });
}
