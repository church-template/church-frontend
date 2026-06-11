import { apiUrl } from "./apiBase";
import { parseJson } from "./apiError";
import { authFetch } from "./authFetch";
import { useAuthStore } from "./authStore";
import type { LoginResponse, SignupRequest, SignupResponse } from "./types";

// 공개 API: 토큰 헤더 없음. apiUrl로 base 결합.
export async function login(phone: string, password: string): Promise<LoginResponse> {
  const res = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  const data = await parseJson<LoginResponse>(res);
  useAuthStore.getState().setSession(data);
  return data;
}

// 201, 토큰 없음 → 호출측이 이어서 login을 호출한다.
export async function signup(req: SignupRequest): Promise<SignupResponse> {
  const res = await fetch(apiUrl("/api/auth/signup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return parseJson<SignupResponse>(res);
}

// 멱등 204. 서버 결과와 무관하게 로컬 store를 정리해야 한다.
// 네트워크 오류 시에도 finally로 clear를 보장하므로 에러는 삼킨다.
// React Query 캐시(['me']) 제거는 호출측 핸들러(useQueryClient 보유)가 signOut 이후 수행.
export async function signOut(): Promise<void> {
  const refreshToken = useAuthStore.getState().refreshToken;
  try {
    await authFetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // 멱등 로그아웃: 네트워크 오류나 서버 실패는 무시한다.
    // 로그아웃 중 실패는 권장하지 않으므로 로그하지 않는다(클라의 관심사 아님).
  } finally {
    // 서버 성공·실패·네트워크 오류 모든 경우, 로컬 토큰을 정리.
    useAuthStore.getState().clear();
  }
}
