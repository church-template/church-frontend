import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { fetchMock, usePermMock } = vi.hoisted(() => ({ fetchMock: vi.fn(), usePermMock: vi.fn() }));
vi.mock("@/lib/api/vehicles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/vehicles")>()),
  fetchVehicleRuns: fetchMock,
}));
vi.mock("@/lib/auth/useMe", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useHasPermission: usePermMock,
}));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import { MyVehicleBoardings } from "./MyVehicleBoardings";
import type { VehicleRunCardResponse } from "@/lib/api/types";

const page = (content: VehicleRunCardResponse[]) => ({ content, page: { size: 10, number: 0, totalElements: content.length, totalPages: 1 } });
const applied: VehicleRunCardResponse = { id: 6, departsAt: "2026-08-02T07:30:00", myRequest: { pickupLocation: "태산아파트 정문" } };
const unapplied: VehicleRunCardResponse = { id: 7, departsAt: "2026-08-09T07:30:00", myRequest: null };

let qc: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  usePermMock.mockReturnValue(true);
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true }))); // Reveal reduced 경로
});
afterEach(() => vi.unstubAllGlobals());
const renderIt = () => render(<QueryClientProvider client={qc}><MyVehicleBoardings /></QueryClientProvider>);

describe("MyVehicleBoardings", () => {
  it("다가오는 내 신청 행: 출발 시각·픽업·목록 링크", async () => {
    fetchMock.mockResolvedValue(page([applied]));
    renderIt();
    expect(await screen.findByText("픽업: 태산아파트 정문")).toBeDefined();
    expect(screen.getByRole("link", { name: /출발/ }).getAttribute("href")).toBe("/vehicle-runs");
  });

  it("내 신청 없는 운행은 제외 → 0건이면 비노출(null)", async () => {
    fetchMock.mockResolvedValue(page([unapplied]));
    const { container } = renderIt();
    await new Promise((r) => setTimeout(r, 0));
    expect(container.textContent).toBe("");
  });

  it("권한 없으면 조회 자체를 안 함", () => {
    usePermMock.mockReturnValue(false);
    const { container } = renderIt();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toBe("");
  });

  it("좌표만 신청(픽업 텍스트 없음)이면 '위치 첨부됨'", async () => {
    fetchMock.mockResolvedValue(page([{ id: 8, departsAt: "2026-08-16T07:30:00", myRequest: { latitude: 37.5, longitude: 127.0 } }]));
    renderIt();
    expect(await screen.findByText("픽업: 위치 첨부됨")).toBeDefined();
  });
});
