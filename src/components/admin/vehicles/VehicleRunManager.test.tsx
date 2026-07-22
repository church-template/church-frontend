import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { listMock, deleteMock, searchParamsRef } = vi.hoisted(() => ({
  listMock: vi.fn(),
  deleteMock: vi.fn(),
  searchParamsRef: { current: new URLSearchParams("") },
}));
vi.mock("@/lib/api/vehicles.admin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/vehicles.admin")>()),
  fetchAdminVehicleRuns: listMock,
  deleteVehicleRun: deleteMock,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/mypage/manage/vehicle-runs",
  useSearchParams: () => searchParamsRef.current,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock("./VehicleRunFormDialog", () => ({
  VehicleRunFormDialog: ({ open, editTarget }: { open: boolean; editTarget: { id: number } | null }) => (
    open ? <div>form-dialog:{editTarget?.id ?? "create"}</div> : null
  ),
}));

import { VehicleRunManager } from "./VehicleRunManager";

const row = { id: 3, departsAt: "2026-07-26T07:30:00", note: "본당 앞 출발", version: 2 };
const page = (content: unknown[], totalPages = 1) => ({
  content,
  page: { size: 10, number: 0, totalElements: content.length, totalPages },
});

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  searchParamsRef.current = new URLSearchParams("");
});
afterEach(() => vi.clearAllMocks());
const renderManager = () =>
  render(
    <QueryClientProvider client={qc}>
      <VehicleRunManager />
    </QueryClientProvider>,
  );

describe("VehicleRunManager", () => {
  it("목록 렌더 + 명단 링크(표시용 departsAt 쿼리)", async () => {
    listMock.mockResolvedValue(page([row]));
    renderManager();
    await waitFor(() => expect(screen.getByText("본당 앞 출발")).toBeDefined());
    const roster = screen.getByRole("link", { name: /탑승 명단/ });
    expect(roster.getAttribute("href")).toBe(
      "/mypage/manage/vehicle-runs/3?departsAt=2026-07-26T07%3A30%3A00",
    );
  });

  it("새 운행일 버튼 → 생성 다이얼로그", async () => {
    listMock.mockResolvedValue(page([]));
    renderManager();
    fireEvent.click(await screen.findByRole("button", { name: "새 운행일" }));
    expect(screen.getByText("form-dialog:create")).toBeDefined();
  });

  it("수정 버튼 → 행 값 시드 다이얼로그", async () => {
    listMock.mockResolvedValue(page([row]));
    renderManager();
    fireEvent.click(await screen.findByRole("button", { name: /수정/ }));
    expect(screen.getByText("form-dialog:3")).toBeDefined();
  });

  it("삭제 확인 → delete API + 경고문", async () => {
    listMock.mockResolvedValue(page([row]));
    deleteMock.mockResolvedValue(undefined);
    renderManager();
    fireEvent.click(await screen.findByRole("button", { name: /삭제/ }));
    expect(await screen.findByText("탑승 신청 명단도 함께 사라집니다.")).toBeDefined();
    fireEvent.click(screen.getAllByRole("button", { name: "삭제" }).at(-1)!);
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(3));
  });
});
