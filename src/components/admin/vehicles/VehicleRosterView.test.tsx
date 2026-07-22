import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { rosterMock } = vi.hoisted(() => ({ rosterMock: vi.fn() }));
vi.mock("@/lib/api/vehicles.admin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/vehicles.admin")>()),
  fetchVehicleRoster: rosterMock,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/mypage/manage/vehicle-runs/3",
  useSearchParams: () => new URLSearchParams(""),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { VehicleRosterView } from "./VehicleRosterView";

const entry = {
  name: "홍길동", phone: "010-1234-5678", pickupLocation: "○○아파트 정문",
  note: "2명", requestedAt: "2026-07-20T21:00:00",
};
const page = (content: unknown[], totalPages = 1) => ({
  content,
  page: { size: 20, number: 0, totalElements: content.length, totalPages },
});

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => vi.clearAllMocks());

describe("VehicleRosterView", () => {
  it("명단 렌더 — 연락처는 tel: 링크", async () => {
    rosterMock.mockResolvedValue(page([entry]));
    render(
      <QueryClientProvider client={qc}>
        <VehicleRosterView runId={3} departsAt="2026-07-26T07:30:00" />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText("홍길동")).toBeDefined());
    expect(screen.getByRole("link", { name: "010-1234-5678" }).getAttribute("href")).toBe("tel:010-1234-5678");
    expect(screen.getByText("○○아파트 정문")).toBeDefined();
    expect(rosterMock).toHaveBeenCalledWith(3, { page: 0 });
  });

  it("유효한 departsAt이면 출발시각 부제 표시, 깨진 값이면 생략", async () => {
    rosterMock.mockResolvedValue(page([]));
    const { unmount } = render(
      <QueryClientProvider client={qc}>
        <VehicleRosterView runId={3} departsAt="2026-07-26T07:30:00" />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText(/출발$/)).toBeDefined());
    unmount();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <VehicleRosterView runId={3} departsAt="garbage" />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.queryByText(/출발$/)).toBeNull());
  });

  it("빈 명단 안내", async () => {
    rosterMock.mockResolvedValue(page([]));
    render(
      <QueryClientProvider client={qc}>
        <VehicleRosterView runId={3} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("아직 탑승 신청이 없습니다.")).toBeDefined();
  });

  it("좌표 있는 명단 항목은 '지도 보기' 링크(카카오맵)", async () => {
    rosterMock.mockResolvedValue(
      page([{ name: "홍길동", phone: "010-1234-5678", pickupLocation: "정문", requestedAt: "2026-07-20T21:00:00", latitude: 37.5, longitude: 127.0 }]),
    );
    render(
      <QueryClientProvider client={qc}>
        <VehicleRosterView runId={3} />
      </QueryClientProvider>,
    );
    const link = await screen.findByRole("link", { name: "지도 보기" });
    expect(link.getAttribute("href")).toBe("https://map.kakao.com/link/map/%EC%A0%95%EB%AC%B8,37.5,127");
  });

  it("좌표 없는 항목은 지도 링크 없음", async () => {
    rosterMock.mockResolvedValue(
      page([{ name: "김철수", phone: "010-2222-3333", pickupLocation: "후문", requestedAt: "2026-07-20T21:05:00" }]),
    );
    render(
      <QueryClientProvider client={qc}>
        <VehicleRosterView runId={3} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText("후문")).toBeDefined());
    expect(screen.queryByRole("link", { name: "지도 보기" })).toBeNull();
  });
});
