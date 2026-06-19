// src/components/admin/members/AgreementResetPanel.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { resetMock, notifySuccess } = vi.hoisted(() => ({ resetMock: vi.fn(), notifySuccess: vi.fn() }));
vi.mock("@/lib/api/agreements.admin", () => ({ resetAgreements: resetMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));

import { AgreementResetPanel } from "./AgreementResetPanel";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
const renderPanel = () => render(<QueryClientProvider client={qc}><AgreementResetPanel /></QueryClientProvider>);

describe("AgreementResetPanel", () => {
  it("개인정보 리셋 → 확인창 → resetAgreements('privacy')", async () => {
    resetMock.mockResolvedValue(undefined);
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "개인정보 동의 리셋" }));
    await waitFor(() => expect(screen.getByText("개인정보 동의를 초기화할까요?")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    await waitFor(() => expect(resetMock).toHaveBeenCalledWith("privacy"));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalled());
  });
  it("전체 회원 영향 경고문을 노출한다", () => {
    renderPanel();
    expect(screen.getByText(/전체 회원의 동의를 초기화합니다/)).toBeDefined();
  });
});
