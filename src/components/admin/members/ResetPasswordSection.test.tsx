// src/components/admin/members/ResetPasswordSection.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { resetMock, notifySuccess } = vi.hoisted(() => ({ resetMock: vi.fn(), notifySuccess: vi.fn() }));
vi.mock("@/lib/api/members.admin", () => ({ resetPassword: resetMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
// useMutation은 실제 동작이 필요 없으므로 react-query를 그대로 쓰되 Provider로 감싼다.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ResetPasswordSection } from "./ResetPasswordSection";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
const renderSection = () => render(<QueryClientProvider client={qc}><ResetPasswordSection uuid="u1" /></QueryClientProvider>);

describe("ResetPasswordSection", () => {
  it("인라인 확인 → 초기화 → 임시 비번 1회 표시", async () => {
    resetMock.mockResolvedValue({ temporaryPassword: "Temp!234" });
    renderSection();
    fireEvent.click(screen.getByRole("button", { name: "비밀번호 초기화" }));
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    await waitFor(() => expect(resetMock).toHaveBeenCalledWith("u1"));
    await waitFor(() => expect(screen.getByText("Temp!234")).toBeDefined());
  });
  it("취소하면 초기화하지 않는다", () => {
    renderSection();
    fireEvent.click(screen.getByRole("button", { name: "비밀번호 초기화" }));
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(resetMock).not.toHaveBeenCalled();
  });
});
