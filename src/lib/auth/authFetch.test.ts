import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { authFetch } from "./authFetch";
import { useAuthStore } from "./authStore";

// 보호 endpoint는 Bearer가 "old"면 401 INVALID_TOKEN, 그 외엔 200을 돌려주는 mock.
function makeFetchMock(opts: {
  protectedErrorCode?: string; // 401 본문 errorCode (기본 INVALID_TOKEN)
  refreshOk?: boolean; // refresh 200 여부 (기본 true)
}) {
  const { protectedErrorCode = "INVALID_TOKEN", refreshOk = true } = opts;
  return vi.fn(async (url: string, init: RequestInit = {}) => {
    if (String(url).endsWith("/api/auth/refresh")) {
      return refreshOk
        ? new Response(JSON.stringify({ tokens: { accessToken: "new", refreshToken: "r1" } }), { status: 200 })
        : new Response(JSON.stringify({ errorCode: "INVALID_TOKEN" }), { status: 401 });
    }
    const auth = (init.headers as Record<string, string>)?.Authorization;
    if (auth === "Bearer old") {
      return new Response(JSON.stringify({ errorCode: protectedErrorCode }), { status: 401 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });
}

beforeEach(() => {
  localStorage.clear(); // persist 영속이 테스트 간 누수되지 않게 격리
  useAuthStore.setState({ accessToken: "old", refreshToken: "r1", member: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("authFetch", () => {
  it("검수1: 동시 401 N개가 refresh를 1회만 호출한다", async () => {
    const fetchMock = makeFetchMock({});
    vi.stubGlobal("fetch", fetchMock);

    const results = await Promise.all([authFetch("/api/x"), authFetch("/api/y"), authFetch("/api/z")]);

    const refreshCalls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith("/api/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);
    results.forEach((r) => expect(r.status).toBe(200));
  });

  it("검수2: AUTHENTICATION_FAILED는 refresh하지 않고 원 응답을 반환한다", async () => {
    const fetchMock = makeFetchMock({ protectedErrorCode: "AUTHENTICATION_FAILED" });
    vi.stubGlobal("fetch", fetchMock);

    const res = await authFetch("/api/x");

    expect(res.status).toBe(401);
    expect(fetchMock.mock.calls.some((c) => String(c[0]).endsWith("/api/auth/refresh"))).toBe(false);
  });

  it("검수3: refresh 성공 시 원요청을 새 access로 재시도한다", async () => {
    const fetchMock = makeFetchMock({});
    vi.stubGlobal("fetch", fetchMock);

    const res = await authFetch("/api/x");

    expect(res.status).toBe(200);
    // 마지막 보호요청 재시도는 Bearer new로 나갔다.
    const retry = fetchMock.mock.calls.find(
      (c) => String(c[0]).endsWith("/api/x") && (c[1]?.headers as Record<string, string>)?.Authorization === "Bearer new",
    );
    expect(retry).toBeDefined();
    expect(useAuthStore.getState().accessToken).toBe("new");
  });

  it("검수4: refresh 실패 시 forceLogout 후 원 401 Response를 반환한다(throw 아님)", async () => {
    const fetchMock = makeFetchMock({ refreshOk: false });
    vi.stubGlobal("fetch", fetchMock);

    const res = await authFetch("/api/x");

    expect(res.status).toBe(401);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });

  it("엣지: refreshToken이 없으면 refresh를 시도하지 않고 forceLogout한다", async () => {
    useAuthStore.setState({ accessToken: "old", refreshToken: null, member: null });
    const fetchMock = makeFetchMock({});
    vi.stubGlobal("fetch", fetchMock);

    const res = await authFetch("/api/x");

    expect(res.status).toBe(401);
    expect(fetchMock.mock.calls.some((c) => String(c[0]).endsWith("/api/auth/refresh"))).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
