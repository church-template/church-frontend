import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./authStore";
import type { LoginResponse } from "./types";

const loginRes: LoginResponse = {
  tokens: { accessToken: "a1", refreshToken: "r1" },
  member: { uuid: "u1", name: "홍길동", phone: "01012345678", position: "성도", roles: ["USER"] },
  requiresAgreement: false,
};

beforeEach(() => {
  useAuthStore.getState().clear();
});

describe("authStore", () => {
  it("setSession이 토큰+member를 설정한다", () => {
    useAuthStore.getState().setSession(loginRes);
    const s = useAuthStore.getState();
    expect(s.accessToken).toBe("a1");
    expect(s.refreshToken).toBe("r1");
    expect(s.member?.uuid).toBe("u1");
  });

  it("setAccessToken이 access만 교체한다", () => {
    useAuthStore.getState().setSession(loginRes);
    useAuthStore.getState().setAccessToken("a2");
    const s = useAuthStore.getState();
    expect(s.accessToken).toBe("a2");
    expect(s.refreshToken).toBe("r1"); // refresh는 유지
  });

  it("forceLogout이 토큰+member를 비운다", () => {
    useAuthStore.getState().setSession(loginRes);
    useAuthStore.getState().forceLogout();
    const s = useAuthStore.getState();
    expect(s.accessToken).toBeNull();
    expect(s.refreshToken).toBeNull();
    expect(s.member).toBeNull();
  });
});
