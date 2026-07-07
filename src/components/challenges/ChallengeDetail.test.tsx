import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { fetchChallengeMock, fetchMyProgressMock, fetchMyLogsMock, joinMock, recordMock } = vi.hoisted(() => ({
  fetchChallengeMock: vi.fn(), fetchMyProgressMock: vi.fn(), fetchMyLogsMock: vi.fn(),
  joinMock: vi.fn(), recordMock: vi.fn(),
}));
vi.mock("@/lib/api/challenges", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchChallenge: fetchChallengeMock, fetchMyProgress: fetchMyProgressMock,
  fetchMyLogs: fetchMyLogsMock, joinChallenge: joinMock, recordRead: recordMock,
}));
// 마크다운 렌더는 별도 테스트 대상 — 소스 텍스트만 확인(테스트 관례: mock은 엘리먼트 반환).
vi.mock("@/components/common/MarkdownContent", () => ({
  MarkdownContent: ({ source }: { source: string }) => <div>{source}</div>,
}));

import { ChallengeDetail } from "./ChallengeDetail";

const detail = {
  id: 1, title: "2026 신약 통독", startBook: 40, endBook: 66, startDate: "2026-01-05",
  endDate: "2026-03-10", targetDays: 65, totalChapters: 260, dailyGoal: 4,
  status: "ONGOING", joined: false, version: 0, description: "함께 읽어요",
};
const progress = {
  progressRate: 34.2, currentPosition: { book: "마태복음", chapter: 4 }, chaptersRead: 4,
  totalChapters: 260, todayChapters: 0, dailyGoal: 4, todayDone: false, streakDays: 23,
  roundsCompleted: 0, paceDays: 3,
  challenge: { id: 1, title: "2026 신약 통독", startDate: "2026-01-05", endDate: "2026-03-10", status: "ONGOING", totalChapters: 260 },
};

let qc: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  fetchMyLogsMock.mockResolvedValue([]);
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
const renderDetail = () =>
  render(<QueryClientProvider client={qc}><ChallengeDetail id={1} /></QueryClientProvider>);

describe("ChallengeDetail", () => {
  it("미참여: 참여 CTA + 소개, progress 미호출", async () => {
    fetchChallengeMock.mockResolvedValue(detail);
    renderDetail();
    expect(await screen.findByRole("button", { name: "챌린지 참여하기" })).toBeDefined();
    expect(screen.getByText(/260장을 65일 동안, 하루 4장씩/)).toBeDefined();
    expect(screen.getByText("함께 읽어요")).toBeDefined();
    expect(fetchMyProgressMock).not.toHaveBeenCalled();
  });

  it("참여하기 클릭 → joinChallenge 호출", async () => {
    fetchChallengeMock.mockResolvedValue(detail);
    joinMock.mockResolvedValue(progress);
    renderDetail();
    fireEvent.click(await screen.findByRole("button", { name: "챌린지 참여하기" }));
    await waitFor(() => expect(joinMock).toHaveBeenCalledWith(1));
  });

  it("참여 중: TodayBand + 달력 렌더", async () => {
    fetchChallengeMock.mockResolvedValue({ ...detail, joined: true });
    fetchMyProgressMock.mockResolvedValue(progress);
    renderDetail();
    expect(await screen.findByRole("button", { name: "다 읽었어요" })).toBeDefined();
    expect(screen.getByText("읽기 달력")).toBeDefined();
  });

  it("다 읽었어요 → recordRead(빈 body: 서버 기본값)", async () => {
    fetchChallengeMock.mockResolvedValue({ ...detail, joined: true });
    fetchMyProgressMock.mockResolvedValue(progress);
    recordMock.mockResolvedValue({ ...progress, todayDone: true, todayChapters: 4, chaptersRead: 8 });
    renderDetail();
    fireEvent.click(await screen.findByRole("button", { name: "다 읽었어요" }));
    await waitFor(() => expect(recordMock).toHaveBeenCalledWith(1, {}));
  });

  it("오늘 이미 기록 있음: 더 읽었어요 클릭 → '더 읽은 장 수' 라벨로 다이얼로그 오픈", async () => {
    fetchChallengeMock.mockResolvedValue({ ...detail, joined: true });
    fetchMyProgressMock.mockResolvedValue({ ...progress, todayDone: true, todayChapters: 4 });
    renderDetail();
    fireEvent.click(await screen.findByRole("button", { name: "더 읽었어요" }));
    expect(await screen.findByLabelText("더 읽은 장 수")).toBeDefined();
  });
});
