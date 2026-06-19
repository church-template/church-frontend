import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { updateMeMock, notifySuccess, notifyError } = vi.hoisted(() => ({
  updateMeMock: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock("@/lib/auth/authApi", () => ({ updateMe: updateMeMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: notifyError } }));

import { PasswordChangeSection } from "./PasswordChangeSection";

let qc: QueryClient;
function renderSection() {
  return render(
    <QueryClientProvider client={qc}>
      <PasswordChangeSection />
    </QueryClientProvider>,
  );
}
function open() {
  fireEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));
}
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());

describe("PasswordChangeSection", () => {
  it("불일치면 호출하지 않고 에러를 보인다", async () => {
    renderSection();
    open();
    fireEvent.change(screen.getByLabelText("새 비밀번호"), { target: { value: "abcd1234" } });
    fireEvent.change(screen.getByLabelText("새 비밀번호 확인"), { target: { value: "different" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("비밀번호가 일치하지 않습니다.")).toBeDefined());
    expect(updateMeMock).not.toHaveBeenCalled();
  });

  it("일치하면 updateMe({password})를 호출한다", async () => {
    updateMeMock.mockResolvedValueOnce({});
    renderSection();
    open();
    fireEvent.change(screen.getByLabelText("새 비밀번호"), { target: { value: "abcd1234" } });
    fireEvent.change(screen.getByLabelText("새 비밀번호 확인"), { target: { value: "abcd1234" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(updateMeMock).toHaveBeenCalledWith({ password: "abcd1234" }));
  });
});
