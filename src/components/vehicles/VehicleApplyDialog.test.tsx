import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { applyMock } = vi.hoisted(() => ({ applyMock: vi.fn() }));
vi.mock("@/lib/api/vehicles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/vehicles")>()),
  applyVehicleRequest: applyMock,
}));

import { VehicleApplyDialog } from "./VehicleApplyDialog";
import type { VehicleRunCardResponse } from "@/lib/api/types";

const run: VehicleRunCardResponse = { id: 5, departsAt: "2026-07-26T07:30:00", note: "본당 앞", myRequest: null };

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => vi.clearAllMocks());

const renderDialog = (onOpenChange = vi.fn()) =>
  render(
    <QueryClientProvider client={qc}>
      <VehicleApplyDialog run={run} onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );

describe("VehicleApplyDialog", () => {
  it("픽업 장소 미입력 제출이면 검증 메시지 + API 미호출", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "신청" }));
    expect(await screen.findByText("픽업 장소를 입력해 주세요.")).toBeDefined();
    expect(applyMock).not.toHaveBeenCalled();
  });

  it("제출 성공 시 payload 전달(빈 메모는 생략) + 닫힘", async () => {
    applyMock.mockResolvedValue({ id: 1, runId: 5, pickupLocation: "정문" });
    const onOpenChange = vi.fn();
    renderDialog(onOpenChange);
    fireEvent.change(screen.getByLabelText("픽업 장소 (필수)"), { target: { value: "○○아파트 정문" } });
    fireEvent.click(screen.getByRole("button", { name: "신청" }));
    await waitFor(() => expect(applyMock).toHaveBeenCalledWith(5, { pickupLocation: "○○아파트 정문" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("메모 입력 시 note 포함", async () => {
    applyMock.mockResolvedValue({ id: 1, runId: 5, pickupLocation: "정문" });
    renderDialog();
    fireEvent.change(screen.getByLabelText("픽업 장소 (필수)"), { target: { value: "정문" } });
    fireEvent.change(screen.getByLabelText("메모 (선택)"), { target: { value: "동생과 2명" } });
    fireEvent.click(screen.getByRole("button", { name: "신청" }));
    await waitFor(() => expect(applyMock).toHaveBeenCalledWith(5, { pickupLocation: "정문", note: "동생과 2명" }));
  });
});
