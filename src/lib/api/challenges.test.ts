import { describe, it, expect, vi, beforeEach } from "vitest";

const authFetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));

import {
  fetchChallenges, fetchChallenge, fetchMyProgress, fetchMyLogs, fetchMyParticipations,
  joinChallenge, recordRead, cancelRead, CHALLENGE_PAGE_SIZE,
} from "./challenges";

function jsonRes(data: unknown) {
  return new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
}
const progress = {
  progressRate: 34.2, currentPosition: { book: "마태복음", chapter: 4 }, chaptersRead: 89,
  totalChapters: 260, todayChapters: 0, dailyGoal: 4, todayDone: false, streakDays: 23,
  roundsCompleted: 0, paceDays: 3,
  challenge: { id: 1, title: "T", startDate: "2026-01-05", endDate: "2026-03-10", status: "ONGOING", totalChapters: 260 },
};

beforeEach(() => authFetchMock.mockReset());

describe("목록·상세·이력 GET", () => {
  it("fetchChallenges: page·size·sort(startDate,desc) 쿼리", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes({ content: [], page: { size: 12, number: 0, totalElements: 0, totalPages: 0 } })));
    await fetchChallenges({ page: 0 });
    expect(authFetchMock).toHaveBeenCalledWith(
      `/api/bible-challenges?page=0&size=${CHALLENGE_PAGE_SIZE}&sort=startDate%2Cdesc`,
    );
  });
  it("fetchChallenge: 경로에 id", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes({ id: 7, joined: false })));
    const d = await fetchChallenge(7);
    expect(authFetchMock).toHaveBeenCalledWith("/api/bible-challenges/7");
    expect(d.id).toBe(7);
  });
  it("fetchMyLogs: from/to 있으면 쿼리 포함, 없으면 생략", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes([])));
    await fetchMyLogs(1, { from: "2026-01-01", to: "2026-01-31" });
    expect(authFetchMock).toHaveBeenCalledWith("/api/bible-challenges/1/my-logs?from=2026-01-01&to=2026-01-31");
    await fetchMyLogs(1);
    expect(authFetchMock).toHaveBeenLastCalledWith("/api/bible-challenges/1/my-logs");
  });
  it("fetchMyProgress·fetchMyParticipations 경로", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes(progress)));
    await fetchMyProgress(1);
    expect(authFetchMock).toHaveBeenCalledWith("/api/bible-challenges/1/my-progress");
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes({ content: [], page: { size: 12, number: 0, totalElements: 0, totalPages: 0 } })));
    await fetchMyParticipations({ page: 0 });
    expect(authFetchMock).toHaveBeenLastCalledWith(
      `/api/bible-challenges/my-participations?page=0&size=${CHALLENGE_PAGE_SIZE}`,
    );
  });
});

describe("쓰기 3종 — MyProgressResponse 반환", () => {
  it("joinChallenge: POST /join", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes(progress)));
    const p = await joinChallenge(1);
    expect(authFetchMock).toHaveBeenCalledWith("/api/bible-challenges/1/join", { method: "POST" });
    expect(p.streakDays).toBe(23);
  });
  it("recordRead: POST /read, body 필드는 값 있을 때만", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes(progress)));
    await recordRead(1, {});
    expect(authFetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", body: JSON.stringify({}) });
    await recordRead(1, { chapters: 5, date: "2026-01-20" });
    expect(authFetchMock.mock.calls[1][1].body).toBe(JSON.stringify({ chapters: 5, date: "2026-01-20" }));
  });
  it("cancelRead: DELETE /read?date=, date 없으면 쿼리 생략", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes(progress)));
    await cancelRead(1, "2026-01-20");
    expect(authFetchMock).toHaveBeenCalledWith("/api/bible-challenges/1/read?date=2026-01-20", { method: "DELETE" });
    await cancelRead(1);
    expect(authFetchMock).toHaveBeenLastCalledWith("/api/bible-challenges/1/read", { method: "DELETE" });
  });
});
