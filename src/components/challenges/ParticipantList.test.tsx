import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const fetchParticipantsMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/challenges", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchParticipants: fetchParticipantsMock,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/challenges/1",
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import { ParticipantList } from "./ParticipantList";
import { ApiError } from "@/lib/auth/apiError";

const row = (over: Partial<Record<string, unknown>> = {}) => ({
  name: "김통독", chaptersRead: 5, progressRate: 1.9, roundsCompleted: 0,
  currentPosition: { book: "마태복음", chapter: 5 }, me: false, ...over,
});
const page = (content: unknown[]) => ({
  content,
  page: { size: 10, number: 0, totalElements: content.length, totalPages: 1 },
});

let qc: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
const renderList = () =>
  render(
    <QueryClientProvider client={qc}>
      <ParticipantList id={1} />
    </QueryClientProvider>,
  );

describe("ParticipantList — 참여자 진도 명단(#121)", () => {
  it("서버 정렬 순서를 그대로 그리고, 회독 완료자는 회독 배지를 단다", async () => {
    fetchParticipantsMock.mockResolvedValue(
      page([
        row({ name: "박완주", chaptersRead: 0, progressRate: 0, roundsCompleted: 1, currentPosition: null }),
        row({ name: "김통독", me: true }),
      ]),
    );
    renderList();

    const items = await screen.findAllByRole("listitem");
    expect(items[0].textContent).toContain("박완주");
    expect(items[0].textContent).toContain("1회독");
    expect(items[1].textContent).toContain("김통독");
    // 아직 한 장도 안 읽은 참여자 — 권·장 대신 상태 문구
    expect(items[0].textContent).toContain("아직 시작 전");
    expect(items[1].textContent).toContain("마태복음 5장");
  });

  it("내 행만 강조한다", async () => {
    fetchParticipantsMock.mockResolvedValue(page([row({ name: "박완주" }), row({ name: "김통독", me: true })]));
    renderList();

    await screen.findByText("김통독");
    const items = screen.getAllByRole("listitem");
    expect(items[1].className).toContain("bg-primary-soft");
    expect(items[0].className).not.toContain("bg-primary-soft");
  });

  it("참여자가 나뿐이면 명단 대신 안내를 보여준다", async () => {
    fetchParticipantsMock.mockResolvedValue(page([row({ me: true })]));
    renderList();

    expect(await screen.findByText(/혼자 읽고 있어요/)).toBeDefined();
    expect(screen.queryAllByRole("listitem").length).toBe(0);
  });

  it("열람 자격이 없으면(403) 섹션을 통째로 숨긴다", async () => {
    fetchParticipantsMock.mockRejectedValue(new ApiError(403, "ACCESS_DENIED", "권한 없음"));
    const { container } = renderList();

    await vi.waitFor(() => expect(fetchParticipantsMock).toHaveBeenCalled());
    await vi.waitFor(() => expect(container.querySelector("section")).toBeNull());
  });
});
