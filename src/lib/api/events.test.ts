import { describe, it, expect, vi, afterEach } from "vitest";
import { buildEventQuery, getEvents, getEvent, EVENTS_PAGE_SIZE } from "./events";

afterEach(() => vi.unstubAllGlobals());

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

describe("buildEventQuery", () => {
  it("year·month·size를 항상 함께 직렬화(반쪽 파라미터 없음)", () => {
    expect(buildEventQuery({ year: 2026, month: 6 })).toBe(
      `?year=2026&month=6&size=${EVENTS_PAGE_SIZE}`,
    );
  });
  it("tagId가 있으면 덧붙인다", () => {
    expect(buildEventQuery({ year: 2026, month: 6, tagId: 3 })).toBe(
      `?year=2026&month=6&size=${EVENTS_PAGE_SIZE}&tagId=3`,
    );
  });
});

describe("getEvents", () => {
  it("'/api/events'+쿼리를 revalidate 60으로 호출", async () => {
    const spy = vi.fn(async () => okResponse({ content: [], page: {} }));
    vi.stubGlobal("fetch", spy);
    await getEvents({ year: 2026, month: 6, tagId: 3 });
    expect(spy).toHaveBeenCalledWith(`/api/events?year=2026&month=6&size=${EVENTS_PAGE_SIZE}&tagId=3`, {
      next: { revalidate: 60, tags: ["events"] },
    });
  });
  it("비 200이면 throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    await expect(getEvents({ year: 2026, month: 6 })).rejects.toThrow("GET /api/events 실패: 500");
  });
});

describe("getEvent", () => {
  it("'/api/events/{id}'를 revalidate 60으로 호출(no-store 아님 — viewCount 없음)", async () => {
    const spy = vi.fn(async () => okResponse({ id: 5 }));
    vi.stubGlobal("fetch", spy);
    await getEvent(5);
    expect(spy).toHaveBeenCalledWith("/api/events/5", { next: { revalidate: 60, tags: ["events"] } });
  });
  it("404는 null", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 }) as Response));
    expect(await getEvent(99)).toBeNull();
  });
  it("그 외 에러는 throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 }) as Response));
    await expect(getEvent(5)).rejects.toThrow("GET /api/events/5 실패: 503");
  });
});
