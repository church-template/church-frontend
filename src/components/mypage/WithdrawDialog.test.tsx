import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/auth/apiError";

const { withdrawMock, replace, notifyError, notifySuccess } = vi.hoisted(() => ({
  withdrawMock: vi.fn(),
  replace: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("@/lib/auth/authApi", () => ({ withdraw: withdrawMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));
vi.mock("@/lib/notify", () => ({ notify: { error: notifyError, success: notifySuccess } }));

import { WithdrawDialog } from "./WithdrawDialog";

let qc: QueryClient;
function renderDialog() {
  return render(
    <QueryClientProvider client={qc}>
      <WithdrawDialog />
    </QueryClientProvider>,
  );
}

// 다이얼로그를 열고 비밀번호를 채운다.
function openAndType(pw: string) {
  fireEvent.click(screen.getByRole("button", { name: "회원 탈퇴" }));
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: pw } });
}

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => vi.clearAllMocks());

describe("WithdrawDialog", () => {
  it("성공 시 me 캐시를 제거하고 홈으로 이동한다", async () => {
    withdrawMock.mockResolvedValueOnce(undefined);
    const removeSpy = vi.spyOn(qc, "removeQueries");
    renderDialog();
    openAndType("password1");
    fireEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(withdrawMock).toHaveBeenCalledWith("password1");
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ["me"] });
    expect(notifySuccess).toHaveBeenCalled();
  });

  it("비밀번호 미입력 시 호출하지 않고 인라인 에러를 보인다", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "회원 탈퇴" }));
    fireEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));
    expect(withdrawMock).not.toHaveBeenCalled();
    expect(screen.getByText("비밀번호를 입력해 주세요.")).toBeDefined();
  });

  it("비밀번호 불일치(401) 시 인라인 에러를 보이고 이동하지 않는다", async () => {
    withdrawMock.mockRejectedValueOnce(
      new ApiError(401, "AUTHENTICATION_FAILED", undefined),
    );
    renderDialog();
    openAndType("wrong");
    fireEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));

    await waitFor(() =>
      expect(screen.getByText("전화번호 또는 비밀번호가 올바르지 않습니다.")).toBeDefined(),
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("탈퇴하기 버튼은 destructive 스타일(bg-error)을 쓴다", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "회원 탈퇴" }));
    expect(screen.getByRole("button", { name: "탈퇴하기" }).className).toContain("bg-error");
  });
});
