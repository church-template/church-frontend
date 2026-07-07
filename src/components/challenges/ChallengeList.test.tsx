import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { fetchChallengesMock, fetchPartsMock, fetchProgressMock, fetchChallengeMock } = vi.hoisted(() => ({
  fetchChallengesMock: vi.fn(), fetchPartsMock: vi.fn(), fetchProgressMock: vi.fn(), fetchChallengeMock: vi.fn(),
}));
vi.mock("@/lib/api/challenges", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchChallenges: fetchChallengesMock, fetchMyParticipations: fetchPartsMock, fetchMyProgress: fetchProgressMock,
  fetchChallenge: fetchChallengeMock,
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(""), usePathname: () => "/challenges" }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import { ChallengeList } from "./ChallengeList";

const card = {
  id: 1, title: "2026 신약 통독", startBook: 40, endBook: 66, startDate: "2026-01-05",
  endDate: "2026-03-10", targetDays: 65, totalChapters: 260, dailyGoal: 4, status: "ONGOING",
};
const page = (content: unknown[]) => ({ content, page: { size: 12, number: 0, totalElements: content.length, totalPages: 1 } });
const participation = {
  challenge: { id: 1, title: "2026 신약 통독", startDate: "2026-01-05", endDate: "2026-03-10", status: "ONGOING", totalChapters: 260 },
  joinedAt: "2026-01-05", progressRate: 34.2, chaptersRead: 89, roundsCompleted: 0, completed: false, streakDays: 23,
};
const progress = {
  progressRate: 34.2, currentPosition: { book: "마태복음", chapter: 4 }, chaptersRead: 4, totalChapters: 260,
  todayChapters: 0, dailyGoal: 4, todayDone: false, streakDays: 23, roundsCompleted: 0, paceDays: 3,
  challenge: participation.challenge,
};
// 상세 fixture — startBook은 목록 카드가 아니라 이 상세에서 온다(Finding 1).
const detail = { ...card, description: null, joined: true, version: 1 };

let qc: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
const renderList = () => render(<QueryClientProvider client={qc}><ChallengeList /></QueryClientProvider>);

describe("ChallengeList — 피처 판별 3케이스(스펙 §3)", () => {
  it("참여 중 ONGOING: 오늘 요약 피처 + 기록하러 가기 링크", async () => {
    fetchChallengesMock.mockResolvedValue(page([card]));
    fetchPartsMock.mockResolvedValue(page([participation]));
    fetchProgressMock.mockResolvedValue(progress);
    fetchChallengeMock.mockResolvedValue(detail);
    renderList();
    const cta = await screen.findByRole("link", { name: /오늘 기록하러 가기/ });
    expect(cta.getAttribute("href")).toBe("/challenges/1");
    expect(await screen.findByText(/마태복음 5장부터/)).toBeDefined();
  });

  it("참여 중 챌린지가 목록 페이지에 없어도(다른 카드만) 상세 startBook으로 오늘 위치 계산(Finding 1)", async () => {
    fetchChallengesMock.mockResolvedValue(page([{ ...card, id: 2, status: "ENDED", title: "다른 챌린지" }]));
    fetchPartsMock.mockResolvedValue(page([participation]));
    fetchProgressMock.mockResolvedValue(progress);
    fetchChallengeMock.mockResolvedValue(detail);
    renderList();
    expect(await screen.findByText(/마태복음 5장부터/)).toBeDefined();
  });

  it("미참여 ONGOING: 참여 CTA 피처", async () => {
    fetchChallengesMock.mockResolvedValue(page([card]));
    fetchPartsMock.mockResolvedValue(page([]));
    renderList();
    const cta = await screen.findByRole("link", { name: /참여하러 가기/ });
    expect(cta.getAttribute("href")).toBe("/challenges/1");
    expect(fetchProgressMock).not.toHaveBeenCalled();
  });

  it("ONGOING 없음: 피처 없이 그리드만, 0건이면 EmptyState", async () => {
    fetchChallengesMock.mockResolvedValue(page([]));
    fetchPartsMock.mockResolvedValue(page([]));
    renderList();
    expect(await screen.findByText("등록된 챌린지가 없습니다.")).toBeDefined();
  });

  it("카드에 상태·기간·범위 표기", async () => {
    fetchChallengesMock.mockResolvedValue(page([{ ...card, id: 2, status: "ENDED", title: "지난 통독" }]));
    fetchPartsMock.mockResolvedValue(page([]));
    renderList();
    expect(await screen.findByText("지난 통독")).toBeDefined();
    expect(screen.getByText("종료")).toBeDefined();
    expect(screen.getByText(/마태복음 ~ 요한계시록 · 260장 · 하루 4장/)).toBeDefined();
  });

  it("ENDED 카드만 있고 참여도 없으면 피처 섹션 미노출", async () => {
    fetchChallengesMock.mockResolvedValue(page([{ ...card, id: 2, status: "ENDED", title: "지난 통독" }]));
    fetchPartsMock.mockResolvedValue(page([]));
    renderList();
    await screen.findByText("지난 통독");
    expect(screen.queryByText("진행 중인 챌린지")).toBeNull();
  });
});
