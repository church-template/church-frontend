import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { login, signup, signOut, withdraw, updateMe } from "./authApi";
import { useAuthStore } from "./authStore";
import type { LoginResponse } from "./types";

beforeEach(() => {
  localStorage.clear(); // persist 영속이 테스트 간 누수되지 않게 격리
  useAuthStore.getState().clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const mockLoginResponse: LoginResponse = {
  tokens: { accessToken: "a1", refreshToken: "r1" },
  member: { uuid: "u1", name: "홍길동", phone: "01012345678", position: "성도", roles: ["USER"] },
  requiresAgreement: false,
};

describe("login", () => {
  it("성공 시 setSession으로 토큰+member를 저장한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify(mockLoginResponse), { status: 200 }),
      ),
    );

    const res = await login("01012345678", "password1");

    expect(res.member.uuid).toBe("u1");
    expect(useAuthStore.getState().accessToken).toBe("a1");
    expect(useAuthStore.getState().refreshToken).toBe("r1");
  });

  it("401 에러 시 ApiError를 throw한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ errorCode: "AUTHENTICATION_FAILED", detail: "전화번호 또는 암호가 일치하지 않습니다" }),
          { status: 401 },
        ),
      ),
    );

    await expect(login("01012345678", "wrong")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      errorCode: "AUTHENTICATION_FAILED",
    });
  });
});

describe("signup", () => {
  it("성공 시 201과 SignupResponse를 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            uuid: "u2",
            name: "임꺽정",
            phone: "01087654321",
            roles: ["USER"],
          }),
          { status: 201 },
        ),
      ),
    );

    const res = await signup({
      phone: "01087654321",
      name: "임꺽정",
      password: "pass123",
      termsAgreed: true,
      privacyAgreed: true,
    });

    expect(res.uuid).toBe("u2");
    expect(res.name).toBe("임꺽정");
  });

  it("400 중복 가입 시 ApiError를 throw한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ errorCode: "DUPLICATE_PHONE", detail: "이미 가입된 전화번호입니다" }),
          { status: 400 },
        ),
      ),
    );

    await expect(
      signup({
        phone: "01012345678",
        name: "홍길동",
        password: "pass123",
        termsAgreed: true,
        privacyAgreed: true,
      }),
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      errorCode: "DUPLICATE_PHONE",
    });
  });
});

describe("signOut", () => {
  it("성공 시 로컬 토큰+member를 정리한다", async () => {
    useAuthStore.getState().setSession(mockLoginResponse);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(undefined, { status: 204 })),
    );

    await signOut();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
    expect(useAuthStore.getState().member).toBeNull();
  });

  it("서버 요청이 실패해도 로컬 store를 반드시 비운다", async () => {
    useAuthStore.getState().setSession(mockLoginResponse);
    // 네트워크 오류를 시뮬레이션: fetch가 reject.
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));

    await signOut();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
    expect(useAuthStore.getState().member).toBeNull();
  });

  it("서버 응답이 비-2xx여도 로컬 store를 반드시 비운다", async () => {
    useAuthStore.getState().setSession(mockLoginResponse);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ errorCode: "INVALID_TOKEN" }),
          { status: 401 },
        ),
      ),
    );

    await signOut();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });
});

describe("withdraw", () => {
  it("204 성공 시 로컬 토큰+member를 정리한다", async () => {
    useAuthStore.getState().setSession(mockLoginResponse);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(undefined, { status: 204 })),
    );

    await withdraw("password1");

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
    expect(useAuthStore.getState().member).toBeNull();
  });

  it("비밀번호 불일치(401) 시 ApiError를 throw하고 세션을 유지한다", async () => {
    useAuthStore.getState().setSession(mockLoginResponse);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ errorCode: "AUTHENTICATION_FAILED" }),
          { status: 401 },
        ),
      ),
    );

    await expect(withdraw("wrong")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      errorCode: "AUTHENTICATION_FAILED",
    });
    // 탈퇴 실패 — 로컬 세션은 그대로 유지되어야 한다.
    expect(useAuthStore.getState().accessToken).toBe("a1");
  });

  it("마지막 SUPER_ADMIN 차단(403) 시 ApiError를 throw한다", async () => {
    useAuthStore.getState().setSession(mockLoginResponse);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ errorCode: "ACCESS_DENIED", detail: "마지막 관리자는 탈퇴할 수 없습니다" }),
          { status: 403 },
        ),
      ),
    );

    await expect(withdraw("password1")).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
      errorCode: "ACCESS_DENIED",
    });
    expect(useAuthStore.getState().accessToken).toBe("a1");
  });
});

describe("updateMe", () => {
  it("PATCH로 변경 필드만 보내고 MeResponse를 반환한다", async () => {
    useAuthStore.setState({ accessToken: "a1", refreshToken: "r1", member: null });
    const meRes = {
      uuid: "u1", name: "새이름", phone: "01012345678", email: "", position: "집사",
      roles: ["MEMBER"], permissions: [], maxPriority: 0,
      termsAgreed: true, privacyAgreed: true, agreedAt: null,
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(meRes), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await updateMe({ name: "새이름" });

    expect(res.name).toBe("새이름");
    // vi.fn() mock.calls 타입이 [][] 로 추론되므로 unknown 경유 캐스팅
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const init = calls[0]![1];
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ name: "새이름" });
  });
});
