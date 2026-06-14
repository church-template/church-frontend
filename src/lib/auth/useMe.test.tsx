import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMe, useHasPermission, useHasAnyPermission } from "./useMe";
import { useAuthStore } from "./authStore";
import { ApiError } from "./apiError";

// 렌더마다 새 QueryClient가 생기면 캐시가 초기화되므로 테스트당 1회만 생성(클로저 전달).
let qc: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  localStorage.clear(); // persist 영속이 테스트 간 누수되지 않게 격리
  useAuthStore.setState({ accessToken: "a1", refreshToken: "r1", member: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function permWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("useMe", () => {
  it("성공 시 MeResponse를 data로 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            uuid: "u1", name: "홍길동", phone: "01012345678", email: "", position: "성도",
            roles: ["MEMBER"], permissions: ["GALLERY_VIEW"], maxPriority: 0,
            termsAgreed: true, privacyAgreed: true, agreedAt: "2026-01-01T00:00:00",
          }),
          { status: 200 },
        ),
      ),
    );

    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.permissions).toContain("GALLERY_VIEW");
  });

  it("403이면 ApiError로 error 분기된다(성공 데이터로 캐시하지 않음)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ errorCode: "ACCESS_DENIED" }), { status: 403 })),
    );

    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).status).toBe(403);
  });
});

describe("useHasPermission / useHasAnyPermission", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            uuid: "u1", name: "관리자", phone: "01000000000", email: "", position: "목사",
            roles: ["ADMIN"], permissions: ["SERMON_WRITE", "NOTICE_WRITE"], maxPriority: 100,
            termsAgreed: true, privacyAgreed: true, agreedAt: "2026-01-01T00:00:00",
          }),
          { status: 200 },
        ),
      ),
    );
  });

  it("useHasPermission: 보유 권한이면 true, 미보유면 false", async () => {
    const { result } = renderHook(
      () => ({ a: useHasPermission("SERMON_WRITE"), b: useHasPermission("MEDIA_MANAGE") }),
      { wrapper: permWrapper() },
    );
    await waitFor(() => expect(result.current.a).toBe(true));
    expect(result.current.b).toBe(false);
  });

  it("useHasAnyPermission: 하나라도 보유면 true", async () => {
    const { result } = renderHook(
      () => ({
        any: useHasAnyPermission(["MEDIA_MANAGE", "NOTICE_WRITE"]),
        none: useHasAnyPermission(["MEDIA_MANAGE", "ROLE_MANAGE"]),
      }),
      { wrapper: permWrapper() },
    );
    await waitFor(() => expect(result.current.any).toBe(true));
    expect(result.current.none).toBe(false);
  });
});
