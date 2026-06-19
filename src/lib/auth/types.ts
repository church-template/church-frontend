// docs/api-docs.json 기준 인증 DTO. tokens는 항상 중첩(TokenPair).
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface MemberSummary {
  uuid: string;
  name: string;
  phone: string;
  position: string;
  roles: string[];
}

export interface LoginResponse {
  tokens: TokenPair;
  member: MemberSummary;
  requiresAgreement: boolean;
}

export interface SignupRequest {
  phone: string;
  name: string;
  password: string;
  email?: string;
  termsAgreed: boolean;
  privacyAgreed: boolean;
}

export interface SignupResponse {
  uuid: string;
  name: string;
  phone: string;
  roles: string[];
}

// GET /api/members/me — 라이브 권한·약관상태. permissions로 게이팅(가이드 2.1).
export interface MeResponse {
  uuid: string;
  name: string;
  phone: string;
  email: string;
  position: string;
  roles: string[];
  permissions: string[];
  maxPriority: number;
  approved: boolean; // 교인 승인 여부(백엔드 단일 소스 isApproved). roles 직접 판정 금지 — 어드민은 MEMBER 없이도 승인
  termsAgreed: boolean;
  privacyAgreed: boolean;
  agreedAt: string | null; // OpenAPI @JsonInclude(NON_NULL) — 미동의 시 누락 가능
}

// api-docs AgreementResponse — GET/PATCH /api/members/me/agreements 공용 응답.
export interface AgreementResponse {
  termsAgreed: boolean;
  privacyAgreed: boolean;
  agreedAt: string | null;
}

export interface AgreementUpdateRequest {
  termsAgreed: boolean;
  privacyAgreed: boolean;
}

// DELETE /api/members/me — 자가탈퇴. 현재 비밀번호로 재인증(api-docs WithdrawRequest).
export interface WithdrawRequest {
  password: string;
}

// PATCH /api/members/me — 본인 프로필 부분 수정(MeUpdateRequest). 미전송(undefined) 필드는 미변경(전송한 필드만 적용).
export interface MeUpdateRequest {
  name?: string;
  phone?: string;
  password?: string;
  email?: string;
}
