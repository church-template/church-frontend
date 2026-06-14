import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSyncExternalStore } from "react";
import type { LoginResponse, MemberSummary } from "./types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  member: MemberSummary | null; // 표시용 스냅샷 — 권한 판단은 useMe(라이브)
  setSession: (res: LoginResponse) => void;
  setAccessToken: (token: string) => void;
  // 동작은 같지만 의미가 다른 두 액션 — 호출 맥락 추적·향후 분기(예: 세션만료 안내)를 위해 분리 유지.
  forceLogout: () => void; // refresh 실패 등 시스템 강제 로그아웃
  clear: () => void; // 사용자가 직접 로그아웃

}

const EMPTY = { accessToken: null, refreshToken: null, member: null } as const;

// 토큰의 단일 출처. persist가 localStorage 영속을 담당(토큰 저장소 추상화).
// 회원 영역('use client')에서만 접근 — 공개 서버 컴포넌트는 import하지 않으므로 SSR localStorage 접근 없음.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...EMPTY,
      setSession: (res) =>
        set({
          accessToken: res.tokens.accessToken,
          refreshToken: res.tokens.refreshToken,
          member: res.member,
        }),
      setAccessToken: (token) => set({ accessToken: token }), // refresh: access만 갱신
      forceLogout: () => set({ ...EMPTY }),
      clear: () => set({ ...EMPTY }),
    }),
    { name: "church-auth" },
  ),
);

// 첫 렌더 hydration 불일치 방지용 가드(회원 영역 소비측에서 사용).
export function hasHydrated(): boolean {
  return useAuthStore.persist.hasHydrated();
}

// persist 복원 완료 여부를 구독형으로 읽는다 — effect 내 동기 setState 없이(SSR 스냅샷 false).
export function useHasHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useAuthStore.persist.onFinishHydration(onChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  );
}
