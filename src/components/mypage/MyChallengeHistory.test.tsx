import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { fetchPartsMock, usePermMock } = vi.hoisted(() => ({ fetchPartsMock: vi.fn(), usePermMock: vi.fn() }));
vi.mock("@/lib/api/challenges", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchMyParticipations: fetchPartsMock,
}));
vi.mock("@/lib/auth/useMe", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useHasPermission: usePermMock,
}));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import { MyChallengeHistory } from "./MyChallengeHistory";

const part = (over: object = {}) => ({
  challenge: { id: 1, title: "2026 신약 통독", startDate: "2026-01-05", endDate: "2026-03-10", status: "ONGOING", totalChapters: 260 },
  joinedAt: "2026-01-05", progressRate: 34.2, chaptersRead: 89, roundsCompleted: 0, completed: false, streakDays: 23,
  ...over,
});
const page = (content: unknown[]) => ({ content, page: { size: 12, number: 0, totalElements: content.length, totalPages: 1 } });

let qc: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  usePermMock.mockReturnValue(true);
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // MyChallengeHistory는 내부에서 Reveal을 감싼다(ManageHub 관례) — jsdom 미구현 matchMedia 스텁(reduced 경로).
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
});
afterEach(() => vi.unstubAllGlobals());
const renderIt = () => render(<QueryClientProvider client={qc}><MyChallengeHistory /></QueryClientProvider>);

describe("MyChallengeHistory", () => {
  it("참여 이력 행: 제목·상태·진행 요약·상세 링크", async () => {
    fetchPartsMock.mockResolvedValue(page([part()]));
    renderIt();
    expect(await screen.findByText("2026 신약 통독")).toBeDefined();
    expect(screen.getByText("진행 중")).toBeDefined();
    expect(screen.getByText(/34% · 23일 연속/)).toBeDefined();
    expect(screen.getByRole("link", { name: /2026 신약 통독/ }).getAttribute("href")).toBe("/challenges/1");
  });

  it("완독이면 완독 배지", async () => {
    fetchPartsMock.mockResolvedValue(page([part({ completed: true, roundsCompleted: 1 })]));
    renderIt();
    expect(await screen.findByText("완독")).toBeDefined();
  });

  it("이력 0건이면 섹션 비노출(null)", async () => {
    fetchPartsMock.mockResolvedValue(page([]));
    const { container } = renderIt();
    await new Promise((r) => setTimeout(r, 0));
    expect(container.textContent).toBe("");
  });

  it("권한 없으면 조회 자체를 안 함", () => {
    usePermMock.mockReturnValue(false);
    const { container } = renderIt();
    expect(fetchPartsMock).not.toHaveBeenCalled();
    expect(container.textContent).toBe("");
  });
});
