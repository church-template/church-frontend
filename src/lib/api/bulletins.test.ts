import { describe, it, expect, vi, afterEach } from "vitest";
import { getBulletins } from "./bulletins";

afterEach(() => vi.unstubAllGlobals());

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

// buildListQuery 자체는 page.test.ts가 커버 — 여기선 호출 URL·옵션·에러만 검증.
describe("getBulletins", () => {
  it("'/api/bulletins'+쿼리를 revalidate 60으로 호출", async () => {
    const spy = vi.fn(async () => okResponse({ content: [], page: {} }));
    vi.stubGlobal("fetch", spy);
    await getBulletins({ page: 2 });
    expect(spy).toHaveBeenCalledWith("/api/bulletins?page=2", {
      next: { revalidate: 60 },
    });
  });

  it("파라미터 생략 시 쿼리 없이 호출(서버 기본 serviceDate,desc 신뢰)", async () => {
    const spy = vi.fn(async () => okResponse({ content: [], page: {} }));
    vi.stubGlobal("fetch", spy);
    await getBulletins();
    expect(spy).toHaveBeenCalledWith("/api/bulletins", {
      next: { revalidate: 60 },
    });
  });

  it("비 200이면 throw", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500 }) as Response),
    );
    await expect(getBulletins({})).rejects.toThrow(
      "GET /api/bulletins 실패: 500",
    );
  });
});
