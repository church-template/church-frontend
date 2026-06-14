import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiMutate } from "./apiMutate";
import { ApiError } from "@/lib/auth/apiError";
import { useAuthStore } from "@/lib/auth/authStore";

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ accessToken: "a1", refreshToken: "r1", member: null });
});
afterEach(() => vi.unstubAllGlobals());

describe("apiMutate", () => {
  it("2xx + 본문이면 파싱해 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ id: 7, title: "새 설교" }), { status: 201 })),
    );
    const result = await apiMutate<{ id: number; title: string }>("/api/admin/sermons", {
      method: "POST",
      body: { title: "새 설교" },
    });
    expect(result.id).toBe(7);
  });

  it("204면 undefined를 반환한다(빈 본문 파싱 에러 없이)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
    const result = await apiMutate<void>("/api/admin/sermons/7", { method: "DELETE" });
    expect(result).toBeUndefined();
  });

  it("비-2xx면 ApiError를 throw한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ errorCode: "ACCESS_DENIED" }), { status: 403 })),
    );
    await expect(
      apiMutate("/api/admin/sermons", { method: "POST", body: {} }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
