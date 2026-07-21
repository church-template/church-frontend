import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { createMock, patchMock } = vi.hoisted(() => ({ createMock: vi.fn(), patchMock: vi.fn() }));
vi.mock("@/lib/api/vehicles.admin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/vehicles.admin")>()),
  createVehicleRun: createMock,
  patchVehicleRun: patchMock,
}));

import { VehicleRunFormDialog } from "./VehicleRunFormDialog";
import type { VehicleRunDetailResponse } from "@/lib/api/types";

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => vi.clearAllMocks());

const renderDialog = (editTarget: VehicleRunDetailResponse | null = null, onOpenChange = vi.fn()) =>
  render(
    <QueryClientProvider client={qc}>
      <VehicleRunFormDialog open onOpenChange={onOpenChange} editTarget={editTarget} />
    </QueryClientProvider>,
  );

describe("VehicleRunFormDialog", () => {
  it("출발 시각 미선택 제출이면 검증 메시지 + API 미호출", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("출발 시각을 선택해 주세요.")).toBeDefined();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("생성: toServerDateTime 직렬화 + 빈 메모 생략", async () => {
    createMock.mockResolvedValue({ id: 1, departsAt: "2026-07-26T07:30:00", version: 0 });
    renderDialog();
    fireEvent.change(screen.getByLabelText("출발 시각"), { target: { value: "2026-07-26T07:30" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createMock).toHaveBeenCalledWith({ departsAt: "2026-07-26T07:30:00" }));
  });

  it("수정: 행 값 시드 + version 포함 PATCH", async () => {
    patchMock.mockResolvedValue({ id: 3, departsAt: "2026-07-26T08:00:00", version: 3 });
    renderDialog({ id: 3, departsAt: "2026-07-26T07:30:00", note: "본당 앞", version: 2 });
    // 행 값 시드 확인
    const dt = screen.getByLabelText("출발 시각") as HTMLInputElement;
    await waitFor(() => expect(dt.value).toBe("2026-07-26T07:30"));
    fireEvent.change(dt, { target: { value: "2026-07-26T08:00" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(patchMock).toHaveBeenCalledWith(3, { departsAt: "2026-07-26T08:00:00", note: "본당 앞", version: 2 }),
    );
  });
});
