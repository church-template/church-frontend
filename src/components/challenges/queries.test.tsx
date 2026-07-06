import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { recordReadMock, joinMock, cancelMock } = vi.hoisted(() => ({
  recordReadMock: vi.fn(), joinMock: vi.fn(), cancelMock: vi.fn(),
}));
vi.mock("@/lib/api/challenges", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  recordRead: recordReadMock, joinChallenge: joinMock, cancelRead: cancelMock,
}));

import { useRecordRead } from "./queries";

const progress = {
  progressRate: 36, currentPosition: { book: "마태복음", chapter: 8 }, chaptersRead: 93,
  totalChapters: 260, todayChapters: 4, dailyGoal: 4, todayDone: true, streakDays: 24,
  roundsCompleted: 0, paceDays: 3,
  challenge: { id: 1, title: "T", startDate: "2026-01-05", endDate: "2026-03-10", status: "ONGOING", totalChapters: 260 },
};

let qc: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
);

describe("useRecordRead", () => {
  it("성공 시 progress 캐시를 응답으로 교체하고 logs·detail·participations를 invalidate", async () => {
    recordReadMock.mockResolvedValue(progress);
    const spy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useRecordRead(1), { wrapper });
    result.current.mutate({});
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(qc.getQueryData(["challenge", 1, "progress"])).toEqual(progress);
    expect(spy).toHaveBeenCalledWith({ queryKey: ["challenge", 1, "logs"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["challenge", 1], exact: true });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["my-participations"] });
  });
});
