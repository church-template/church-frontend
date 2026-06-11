import { apiUrl } from "./apiBase";
import { useAuthStore } from "./authStore";

// 동시 401들이 refresh를 1회만 호출하도록 공유 프로미스로 큐잉.
let refreshing: Promise<string> | null = null;

// access를 새로 발급(access만 갱신). 실패 시 forceLogout 후 reject.
async function refresh(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  const r = await fetch(apiUrl("/api/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!r.ok) {
    useAuthStore.getState().forceLogout(); // 401 INVALID_TOKEN
    throw new Error("refresh failed");
  }
  const { tokens } = await r.json();
  useAuthStore.getState().setAccessToken(tokens.accessToken);
  return tokens.accessToken as string;
}

// path는 항상 "/api/..." path만. 항상 Response를 반환(HTTP status로 throw 안 함, 네트워크 오류만 throw).
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = apiUrl(path);
  const withAuth = (token: string | null): RequestInit => ({
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token ?? ""}` },
  });

  const res = await fetch(url, withAuth(useAuthStore.getState().accessToken));
  if (res.status !== 401) return res;

  // INVALID_TOKEN만 refresh 대상. AUTHENTICATION_FAILED 등은 그대로 반환.
  const { errorCode } = await res
    .clone()
    .json()
    .catch(() => ({}) as { errorCode?: string });
  if (errorCode !== "INVALID_TOKEN") return res;

  // refreshToken이 없으면(비로그인·hydration 전) refresh 시도하지 않음.
  if (!useAuthStore.getState().refreshToken) {
    useAuthStore.getState().forceLogout();
    return res;
  }

  refreshing ??= refresh().finally(() => {
    refreshing = null;
  });

  try {
    const fresh = await refreshing;
    return await fetch(url, withAuth(fresh)); // 원요청 재시도
  } catch {
    // refresh 실패: forceLogout은 refresh() 내부에서 1회 수행됨. 원 401 반환.
    return res;
  }
}
