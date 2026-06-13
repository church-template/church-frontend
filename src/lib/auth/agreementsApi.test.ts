import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getMyAgreements, updateMyAgreements } from "./agreementsApi";
import { useAuthStore } from "./authStore";

// authFetch가 Bearer를 붙이므로 실 스토어에 토큰을 넣는다(zustand mock 금지 컨벤션).
beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ accessToken: "a1", refreshToken: "r1", member: null });
});
afterEach(() => vi.unstubAllGlobals());

const body = { termsAgreed: true, privacyAgreed: false, agreedAt: "2026-01-01T00:00:00" };

describe("agreementsApi", () => {
  it("getMyAgreements가 GET /api/members/me/agreements를 호출해 본문을 반환한다", async () => {
    const spy = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status: 200 }));
    vi.stubGlobal("fetch", spy);
    const res = await getMyAgreements();
    expect(String(spy.mock.calls[0][0])).toContain("/api/members/me/agreements");
    expect(res.termsAgreed).toBe(true);
    expect(res.privacyAgreed).toBe(false);
  });

  it("updateMyAgreements가 PATCH + JSON 본문으로 호출한다", async () => {
    const spy = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({ ...body, privacyAgreed: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", spy);
    await updateMyAgreements({ termsAgreed: true, privacyAgreed: true });
    const init = spy.mock.calls[0][1];
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ termsAgreed: true, privacyAgreed: true });
  });

  it("비-2xx는 ApiError(errorCode)로 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        async () =>
          new Response(JSON.stringify({ errorCode: "INVALID_INPUT_VALUE" }), { status: 400 }),
      ),
    );
    await expect(updateMyAgreements({ termsAgreed: true, privacyAgreed: false })).rejects.toMatchObject({
      errorCode: "INVALID_INPUT_VALUE",
    });
  });
});
