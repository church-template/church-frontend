import { describe, it, expect, vi, beforeEach } from "vitest";

const authFetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));

import { buildSermonQuery, fetchSermons, fetchSermon } from "./sermons";

beforeEach(() => authFetchMock.mockReset());

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
