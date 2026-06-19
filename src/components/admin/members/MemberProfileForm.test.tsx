// src/components/admin/members/MemberProfileForm.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { updateMock, notifySuccess, useMeMock } = vi.hoisted(() => ({
  updateMock: vi.fn(), notifySuccess: vi.fn(), useMeMock: vi.fn(),
}));
vi.mock("@/lib/api/members.admin", () => ({ updateMember: updateMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock }));

import { MemberProfileForm } from "./MemberProfileForm";

const member = { uuid: "u1", name: "홍길동", phone: "010-1234-5678", email: "a@b.com", position: "성도", roles: [], permissions: [], approved: true, termsAgreed: true, privacyAgreed: true, agreedAt: null, createdAt: "2026-01-01T00:00:00" };

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // updateMember 미수정 회원(admin과 uuid 다름) → ["me"] 무효화 없음. setQueryData/invalidate는 실제 qc에서 무해.
  useMeMock.mockReturnValue({ data: { uuid: "admin-uuid", maxPriority: 100 } });
});
afterEach(() => vi.clearAllMocks());
const renderForm = () => render(<QueryClientProvider client={qc}><MemberProfileForm member={member} /></QueryClientProvider>);

describe("MemberProfileForm", () => {
  it("read view에서 정보를 표시하고 수정 버튼으로 폼 전환", () => {
    renderForm();
    expect(screen.getByText("a@b.com")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    expect(screen.getByLabelText("이름")).toBeDefined();
  });
  it("저장 시 updateMember 호출 + 성공 토스트", async () => {
    updateMock.mockResolvedValue({ ...member, name: "임꺽정" });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "임꺽정" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(updateMock).toHaveBeenCalledWith("u1", expect.objectContaining({ name: "임꺽정" })));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalled());
  });
});
