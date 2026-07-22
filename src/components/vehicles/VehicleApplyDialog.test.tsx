import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { applyMock, geoMock } = vi.hoisted(() => ({ applyMock: vi.fn(), geoMock: vi.fn() }));
vi.mock("@/lib/api/vehicles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/vehicles")>()),
  applyVehicleRequest: applyMock,
}));
vi.mock("@/lib/geolocation", () => ({ getCurrentPosition: geoMock }));
// 토스트는 sonner Toaster가 이 테스트에 없어 DOM으로 못 잡는다 → notify를 spy로 검증(queries onSuccess도 이 mock 사용).
vi.mock("@/lib/notify", () => ({ notify: { error: vi.fn(), success: vi.fn() } }));

import { VehicleApplyDialog } from "./VehicleApplyDialog";
import { notify } from "@/lib/notify";
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
  it("픽업·위치 모두 없이 제출이면 검증 메시지 + API 미호출", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "신청" }));
    expect(await screen.findByText("픽업 장소를 입력하거나 현재 위치를 첨부해 주세요.")).toBeDefined();
    expect(applyMock).not.toHaveBeenCalled();
  });

  it("픽업 텍스트만 제출 시 좌표 없이 payload 전달 + 닫힘", async () => {
    applyMock.mockResolvedValue({ id: 1, runId: 5, pickupLocation: "정문" });
    const onOpenChange = vi.fn();
    renderDialog(onOpenChange);
    fireEvent.change(screen.getByLabelText("픽업 장소 (선택)"), { target: { value: "○○아파트 정문" } });
    fireEvent.click(screen.getByRole("button", { name: "신청" }));
    await waitFor(() => expect(applyMock).toHaveBeenCalledWith(5, { pickupLocation: "○○아파트 정문" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("메모 입력 시 note 포함", async () => {
    applyMock.mockResolvedValue({ id: 1, runId: 5, pickupLocation: "정문" });
    renderDialog();
    fireEvent.change(screen.getByLabelText("픽업 장소 (선택)"), { target: { value: "정문" } });
    fireEvent.change(screen.getByLabelText("메모 (선택)"), { target: { value: "동생과 2명" } });
    fireEvent.click(screen.getByRole("button", { name: "신청" }));
    await waitFor(() => expect(applyMock).toHaveBeenCalledWith(5, { pickupLocation: "정문", note: "동생과 2명" }));
  });

  it("현재 위치 첨부 → 좌표만으로 제출(검증 게터 미포함)", async () => {
    geoMock.mockResolvedValue({ latitude: 37.5, longitude: 127.0, accuracy: 10 });
    applyMock.mockResolvedValue({ id: 1, runId: 5 });
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "현재 위치 첨부" }));
    await waitFor(() => expect(screen.getByText("위치 첨부됨")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "신청" }));
    await waitFor(() => expect(applyMock).toHaveBeenCalledWith(5, { latitude: 37.5, longitude: 127.0 }));
  });

  it("위치 첨부 후 지우면 다시 검증에 걸린다", async () => {
    geoMock.mockResolvedValue({ latitude: 37.5, longitude: 127.0, accuracy: 10 });
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "현재 위치 첨부" }));
    await waitFor(() => expect(screen.getByText("위치 첨부됨")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "첨부한 위치 지우기" }));
    fireEvent.click(screen.getByRole("button", { name: "신청" }));
    expect(await screen.findByText("픽업 장소를 입력하거나 현재 위치를 첨부해 주세요.")).toBeDefined();
  });

  it("위치 권한 거부 시 에러 토스트(첨부 안 됨)", async () => {
    geoMock.mockRejectedValue(new Error("위치 권한이 거부되었습니다. 주소를 직접 입력해 주세요."));
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "현재 위치 첨부" }));
    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith("위치 권한이 거부되었습니다. 주소를 직접 입력해 주세요."),
    );
    expect(screen.queryByText("위치 첨부됨")).toBeNull();
  });
});
