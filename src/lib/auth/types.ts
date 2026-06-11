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
  termsAgreed: boolean;
  privacyAgreed: boolean;
  agreedAt: string;
}
