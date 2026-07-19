import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

const authFetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));

import { buildSermonQuery, getSermons, getSermon, fetchSermons, fetchSermon } from "./sermons";

afterEach(() => vi.unstubAllGlobals());
beforeEach(() => authFetchMock.mockReset());

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

describe("buildSermonQuery", () => {
  it("빈 파라미터는 빈 문자열", () => {
    expect(buildSermonQuery({})).toBe("");
  });
  it("지정 필드만 직렬화(코드 순서, undefined 생략)", () => {
    expect(buildSermonQuery({ page: 0, tagId: 3, q: "grace" })).toBe(
      "?page=0&tagId=3&q=grace",
    );
  });
  it("sort의 콤마는 인코딩된다", () => {
    expect(buildSermonQuery({ sort: "preachedAt,desc" })).toBe(
      "?sort=preachedAt%2Cdesc",
    );
  });
});

describe("getSermons", () => {
  it("'/api/sermons'+쿼리를 revalidate 60으로 호출", async () => {
    const spy = vi.fn(async () => okResponse({ content: [], page: {} }));
    vi.stubGlobal("fetch", spy);
    await getSermons({ tagId: 3 });
    expect(spy).toHaveBeenCalledWith("/api/sermons?tagId=3", {
      next: { revalidate: 60, tags: ["sermons"] },
    });
  });
  it("비 200이면 throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    await expect(getSermons({})).rejects.toThrow("GET /api/sermons 실패: 500");
  });
});

describe("getSermon", () => {
  it("'/api/sermons/{id}'를 no-store로 호출", async () => {
    const spy = vi.fn(async () => okResponse({ id: 7 }));
    vi.stubGlobal("fetch", spy);
    await getSermon(7);
    expect(spy).toHaveBeenCalledWith("/api/sermons/7", { cache: "no-store" });
  });
  it("404는 null 반환", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 }) as Response));
    expect(await getSermon(99)).toBeNull();
  });
  it("그 외 에러는 throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 }) as Response));
    await expect(getSermon(7)).rejects.toThrow("GET /api/sermons/7 실패: 503");
  });
});

function jsonRes(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("fetchSermons", () => {
  it("authFetch로 '/api/sermons'+쿼리를 호출하고 봉투를 파싱한다", async () => {
    authFetchMock.mockResolvedValue(
      jsonRes({ content: [{ id: 1, title: "A" }], page: { size: 12, number: 0, totalElements: 1, totalPages: 1 } }),
    );
    const data = await fetchSermons({ tagId: 3, q: "grace" });
    expect(authFetchMock).toHaveBeenCalledWith("/api/sermons?tagId=3&q=grace");
    expect(data.content[0].id).toBe(1);
  });
});

describe("fetchSermon", () => {
  it("authFetch로 '/api/sermons/{id}'를 호출하고 상세를 반환한다", async () => {
    authFetchMock.mockResolvedValue(jsonRes({ id: 7, title: "T" }));
    const s = await fetchSermon(7);
    expect(authFetchMock).toHaveBeenCalledWith("/api/sermons/7");
    expect(s.id).toBe(7);
  });
});
