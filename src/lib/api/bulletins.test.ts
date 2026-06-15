// src/lib/api/bulletins.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.stubGlobal("fetch", fetchMock);
vi.mock("@/lib/auth/apiBase", () => ({ apiUrl: (p: string) => `http://test${p}` }));

import { getBulletins, getBulletin } from "./bulletins";

afterEach(() => vi.clearAllMocks());

describe("bulletins public", () => {
  it("getBulletins는 bulletins 태그로 캐시한다", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ content: [], page: {} }) });
    await getBulletins({ page: 0 });
    const init = fetchMock.mock.calls[0][1];
    expect(init.next.tags).toEqual(["bulletins"]);
  });

  it("getBulletin은 no-store로 최신 version을 읽는다", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 1, version: 4 }) });
    const b = await getBulletin(1);
    const init = fetchMock.mock.calls[0][1];
    expect(init.cache).toBe("no-store");
    expect(b.version).toBe(4);
  });
});
