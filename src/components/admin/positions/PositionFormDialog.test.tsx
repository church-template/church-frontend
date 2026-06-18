import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { createMock, patchMock, notifySuccess } = vi.hoisted(() => ({ createMock: vi.fn(), patchMock: vi.fn(), notifySuccess: vi.fn() }));
vi.mock("@/lib/api/positions.admin", () => ({ createPosition: createMock, patchPosition: patchMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));

import { PositionFormDialog } from "./PositionFormDialog";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
const renderDialog = (ui: React.ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

describe("PositionFormDialog", () => {
  it("등록: name+sortOrder를 createPosition에 전달", async () => {
    createMock.mockResolvedValue({ id: 1 });
    renderDialog(<PositionFormDialog open mode="create" onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "목사" } });
    fireEvent.change(screen.getByLabelText("정렬 순서(선택)"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createMock).toHaveBeenCalledWith({ name: "목사", sortOrder: 10 }));
  });

  it("등록: sortOrder 비우면 body에서 생략", async () => {
    createMock.mockResolvedValue({ id: 1 });
    renderDialog(<PositionFormDialog open mode="create" onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "장로" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createMock).toHaveBeenCalledWith({ name: "장로" }));
  });

  it("수정: initial 시드 후 patchPosition 호출", async () => {
    patchMock.mockResolvedValue({ id: 5 });
    renderDialog(<PositionFormDialog open mode="edit" initial={{ id: 5, name: "권사", sortOrder: 30, createdAt: "2026-06-17T00:00:00" }} onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "안수집사" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(patchMock).toHaveBeenCalledWith(5, { name: "안수집사", sortOrder: 30 }));
  });
});
