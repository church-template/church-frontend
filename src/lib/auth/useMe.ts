"use client";
import { useQuery } from "@tanstack/react-query";
import { authFetch } from "./authFetch";
import { parseJson } from "./apiError";
import { hasPermission } from "./permissions";
import { useAuthStore } from "./authStore";
import type { MeResponse } from "./types";

// 라이브 권한·약관상태(가이드 1.5). 성공 시에만 MeResponse, 비-2xx는 ApiError로 error 분기.
export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: () => authFetch("/api/members/me").then((res) => parseJson<MeResponse>(res)),
    enabled: !!accessToken, // 비로그인은 호출 안 함
    retry: false, // 401 refresh·재시도는 authFetch가 처리 — query 레벨 재시도는 이중 처리
  });
}

export function usePermission(perm: string): boolean {
  const { data } = useMe();
  return hasPermission(perm, data);
}
