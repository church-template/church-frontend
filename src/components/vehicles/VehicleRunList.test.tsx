import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { fetchMock, cancelMock } = vi.hoisted(() => ({ fetchMock: vi.fn(), cancelMock: vi.fn() }));
vi.mock("@/lib/api/vehicles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/vehicles")>()),
  fetchVehicleRuns: fetchMock,
  cancelVehicleRequest: cancelMock,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/vehicle-runs",
}));
vi.mock("./VehicleApplyDialog", () => ({
  VehicleApplyDialog: ({ run }: { run: { id: number } | null }) => <div>apply-dialog:{run?.id ?? "none"}</div>,
}));

import { VehicleRunList } from "./VehicleRunList";
import type { VehicleRunCardResponse } from "@/lib/api/types";

const page = (content: VehicleRunCardResponse[], totalPages = 1) => ({
  content,
  page: { size: 10, number: 0, totalElements: content.length, totalPages },
});
const unapplied: VehicleRunCardResponse = { id: 5, departsAt: "2026-07-26T07:30:00", note: "본당 앞 출발", myRequest: null };
const applied: VehicleRunCardResponse = {
  id: 6, departsAt: "2026-08-02T07:30:00", myRequest: { pickupLocation: "정문", note: "2명" },
};

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => vi.clearAllMocks());
const renderList = () =>
  render(
    <QueryClientProvider client={qc}>
      <VehicleRunList />
    </QueryClientProvider>,
  );

describe("VehicleRunList", () => {
  it("빈 목록이면 안내 문구", async () => {
    fetchMock.mockResolvedValue(page([]));
    renderList();
    expect(await screen.findByText("예정된 운행일이 없습니다.")).toBeDefined();
  });

  it("미신청 카드엔 '탑승 신청' 버튼 → 클릭 시 다이얼로그 타깃 설정", async () => {
    fetchMock.mockResolvedValue(page([unapplied]));
    renderList();
    const btn = await screen.findByRole("button", { name: "탑승 신청" });
    expect(screen.getByText("본당 앞 출발")).toBeDefined();
    fireEvent.click(btn);
    expect(screen.getByText("apply-dialog:5")).toBeDefined();
  });

  it("신청됨 카드엔 배지·라벨 픽업 장소·메모·취소 버튼", async () => {
    fetchMock.mockResolvedValue(page([applied]));
    renderList();
    expect(await screen.findByText("신청됨")).toBeDefined();
    expect(screen.getByText("픽업 장소")).toBeDefined();
    expect(screen.getByText("정문")).toBeDefined();
    expect(screen.getByText("2명")).toBeDefined();
    expect(screen.getByRole("button", { name: "신청 취소" })).toBeDefined();
  });

  it("취소 확인 후 cancel API 호출", async () => {
    fetchMock.mockResolvedValue(page([applied]));
    cancelMock.mockResolvedValue(undefined);
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: "신청 취소" }));
    // 확인 다이얼로그의 확정 버튼(같은 라벨) — 다이얼로그가 열리면 두 개가 된다.
    const confirmBtns = await screen.findAllByRole("button", { name: "신청 취소" });
    fireEvent.click(confirmBtns[confirmBtns.length - 1]);
    await waitFor(() => expect(cancelMock).toHaveBeenCalledWith(6));
  });

  it("좌표 있는 신청은 '지도 보기' 링크(카카오맵)", async () => {
    fetchMock.mockResolvedValue(
      page([{ id: 7, departsAt: "2026-08-09T07:30:00", myRequest: { pickupLocation: "정문", latitude: 37.5, longitude: 127.0 } }]),
    );
    renderList();
    const link = await screen.findByRole("link", { name: "지도 보기" });
    expect(link.getAttribute("href")).toBe("https://map.kakao.com/link/map/%EC%A0%95%EB%AC%B8,37.5,127");
  });

  it("좌표만 있고 픽업 텍스트 없으면 '위치 첨부됨' 표기", async () => {
    fetchMock.mockResolvedValue(
      page([{ id: 8, departsAt: "2026-08-16T07:30:00", myRequest: { latitude: 37.5, longitude: 127.0 } }]),
    );
    renderList();
    expect(await screen.findByText("위치 첨부됨")).toBeDefined();
    expect(screen.getByRole("link", { name: "지도 보기" })).toBeDefined();
  });
});
