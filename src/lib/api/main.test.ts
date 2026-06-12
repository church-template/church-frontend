import { describe, it, expect, vi, afterEach } from "vitest";
import { getMain } from "./main";

afterEach(() => {
  vi.unstubAllGlobals();
});

const okResponse = (body: unknown) =>
  ({ ok: true, json: async () => body }) as Response;

describe("getMain", () => {
  it("'/api/main'을 revalidate 60으로 호출한다", async () => {
    const spy = vi.fn(async () =>
      okResponse({ sermons: [], notices: [], upcomingEvents: [] }),
    );
    vi.stubGlobal("fetch", spy);
    await getMain();
    // 테스트 환경은 NEXT_PUBLIC_API_BASE 미설정 → apiUrl이 path만 반환(apiBase.ts 계약)
    expect(spy).toHaveBeenCalledWith("/api/main", { next: { revalidate: 60 } });
  });

  it("배열 누락은 빈 배열로 방어한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse({})));
    const main = await getMain();
    expect(main.sermons).toEqual([]);
    expect(main.notices).toEqual([]);
    expect(main.upcomingEvents).toEqual([]);
  });

  it("비 200이면 throw한다(D4 — error.tsx 위임)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500 }) as Response),
    );
    await expect(getMain()).rejects.toThrow("GET /api/main 실패: 500");
  });
});
