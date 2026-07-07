import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { fetchChallengesMock, deleteMock } = vi.hoisted(() => ({
  fetchChallengesMock: vi.fn(), deleteMock: vi.fn(),
}));
vi.mock("@/lib/api/challenges", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchChallenges: fetchChallengesMock,
}));
vi.mock("@/lib/api/challenges.admin", () => ({
  deleteChallenge: deleteMock, createChallenge: vi.fn(), patchChallenge: vi.fn(),
}));
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

import { ChallengeManager } from "./ChallengeManager";
import { ApiError } from "@/lib/auth/apiError";

const card = {
  id: 1, title: "2026 신약 통독", startBook: 40, endBook: 66, startDate: "2026-01-05",
  endDate: "2026-03-10", targetDays: 65, totalChapters: 260, dailyGoal: 4, status: "ONGOING",
};
const page = (content: unknown[]) => ({ content, page: { size: 12, number: 0, totalElements: content.length, totalPages: 1 } });

let qc: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
const renderManager = () => render(<QueryClientProvider client={qc}><ChallengeManager /></QueryClientProvider>);

describe("ChallengeManager", () => {
  it("목록 렌더: 제목·범위·상태", async () => {
    fetchChallengesMock.mockResolvedValue(page([card]));
    renderManager();
    expect(await screen.findByText("2026 신약 통독")).toBeDefined();
    expect(screen.getByText("마태복음 ~ 요한계시록")).toBeDefined();
    expect(screen.getByText("진행 중")).toBeDefined();
  });

  it("403이면 참여 권한 안내 배너(스펙 §7)", async () => {
    fetchChallengesMock.mockRejectedValue(new ApiError(403, "ACCESS_DENIED", undefined));
    renderManager();
    expect(await screen.findByText(/목록 조회에는 통독 챌린지 참여 권한도 필요합니다/)).toBeDefined();
  });

  it("삭제 확인 → deleteChallenge + 목록 무효화", async () => {
    fetchChallengesMock.mockResolvedValue(page([card]));
    deleteMock.mockResolvedValue(undefined);
    renderManager();
    await screen.findByText("2026 신약 통독");
    fireEvent.click(screen.getByRole("button", { name: "2026 신약 통독 삭제" }));
    fireEvent.click(await screen.findByRole("button", { name: "삭제" }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(1));
  });
});
