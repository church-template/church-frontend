import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { loginMock, replace, spRef } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  replace: vi.fn(),
  spRef: { current: new URLSearchParams() },
}));
vi.mock("@/lib/auth/authApi", () => ({ login: loginMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => spRef.current,
}));

import { LoginForm } from "./LoginForm";
import { ApiError } from "@/lib/auth/apiError";
import { useAuthStore } from "@/lib/auth/authStore";

const member = {
  uuid: "u1",
  name: "홍길동",
  phone: "01012345678",
  position: "성도",
  roles: ["USER"],
};
const loginRes = (requiresAgreement: boolean) => ({
  tokens: { accessToken: "a1", refreshToken: "r1" },
  member,
  requiresAgreement,
});

function fillAndSubmit(phone = "010-1234-5678", password = "password1") {
  fireEvent.change(screen.getByLabelText("전화번호"), { target: { value: phone } });
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "로그인" }));
}

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ accessToken: null, refreshToken: null, member: null });
  spRef.current = new URLSearchParams();
});
afterEach(() => vi.clearAllMocks());

describe("LoginForm", () => {
  it("검수1: 인증 실패는 단일 메시지로 표시한다(없는 번호/틀린 비번 동일 — 가입 여부 비노출)", async () => {
    loginMock.mockRejectedValue(new ApiError(401, "AUTHENTICATION_FAILED", undefined));
    render(<LoginForm />);
    fillAndSubmit();
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "전화번호 또는 비밀번호가 올바르지 않습니다.",
      ),
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("검수4: requiresAgreement=true면 /agreements로 이동한다", async () => {
    loginMock.mockResolvedValue(loginRes(true));
    render(<LoginForm />);
    fillAndSubmit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/agreements"));
  });

  it("requiresAgreement=true + next는 /agreements에 next를 유지한다", async () => {
    spRef.current = new URLSearchParams("next=/gallery");
    loginMock.mockResolvedValue(loginRes(true));
    render(<LoginForm />);
    fillAndSubmit();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/agreements?next=%2Fgallery"),
    );
  });

  it("next가 있으면 로그인 후 해당 내부 경로로 복귀한다", async () => {
    spRef.current = new URLSearchParams("next=/gallery");
    loginMock.mockResolvedValue(loginRes(false));
    render(<LoginForm />);
    fillAndSubmit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/gallery"));
  });

  it("next가 없으면 홈으로 간다", async () => {
    loginMock.mockResolvedValue(loginRes(false));
    render(<LoginForm />);
    fillAndSubmit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("빈 폼 제출은 zod가 차단한다(login 미호출)", async () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    await waitFor(() => expect(screen.getByText("전화번호를 입력해 주세요.")).toBeDefined());
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("이미 로그인 상태면 홈으로 보낸다(역가드)", () => {
    useAuthStore.setState({ accessToken: "a1", refreshToken: "r1", member });
    render(<LoginForm />);
    expect(replace).toHaveBeenCalledWith("/");
  });
});
