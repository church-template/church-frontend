import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/auth/apiError";

const { updateMeMock, notifySuccess, notifyError } = vi.hoisted(() => ({
  updateMeMock: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock("@/lib/auth/authApi", () => ({ updateMe: updateMeMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: notifyError } }));

import { ProfileEditForm } from "./ProfileEditForm";

const me = {
  uuid: "u1", name: "홍길동", phone: "01012345678", email: "hong@example.com", position: "집사",
  roles: ["MEMBER"], permissions: [], maxPriority: 0,
  termsAgreed: true, privacyAgreed: true, agreedAt: null,
};
let qc: QueryClient;
const onDone = vi.fn();
function renderForm() {
  return render(
    <QueryClientProvider client={qc}>
      <ProfileEditForm me={me} onDone={onDone} />
    </QueryClientProvider>,
  );
}
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());

describe("ProfileEditForm", () => {
  it("변경된 필드만 PATCH로 전송한다", async () => {
    updateMeMock.mockResolvedValueOnce({ ...me, name: "임꺽정" });
    renderForm();
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "임꺽정" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(updateMeMock).toHaveBeenCalledWith({ name: "임꺽정" }));
    expect(onDone).toHaveBeenCalled();
  });

  it("변경이 없으면 호출 없이 닫는다", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(updateMeMock).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it("서버 필드 에러를 해당 입력에 매핑한다", async () => {
    updateMeMock.mockRejectedValueOnce(
      new ApiError(400, "INVALID_INPUT_VALUE", undefined, undefined, undefined, [
        { field: "email", reason: "이메일 형식을 확인해 주세요." },
      ]),
    );
    renderForm();
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "임꺽정" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("이메일 형식을 확인해 주세요.")).toBeDefined());
  });
});
