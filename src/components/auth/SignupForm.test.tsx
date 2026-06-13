// src/components/auth/SignupForm.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { loginMock, signupMock, replace, spRef } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  signupMock: vi.fn(),
  replace: vi.fn(),
  spRef: { current: new URLSearchParams() },
}));
vi.mock("@/lib/auth/authApi", () => ({ login: loginMock, signup: signupMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => spRef.current,
}));

import { SignupForm } from "./SignupForm";
import { ApiError } from "@/lib/auth/apiError";
import { useAuthStore } from "@/lib/auth/authStore";

const signupRes = { uuid: "u1", name: "홍길동", phone: "01012345678", roles: ["USER"] };
const loginRes = {
  tokens: { accessToken: "a1", refreshToken: "r1" },
  member: { uuid: "u1", name: "홍길동", phone: "01012345678", position: "성도", roles: ["USER"] },
  requiresAgreement: false,
};

const next = () => fireEvent.click(screen.getByRole("button", { name: "다음" }));
const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

// 1~4스텝을 통과해 약관 스텝까지 진행(이메일은 빈 값으로 통과 — 선택 입력)
async function completeToTerms() {
  fill("전화번호", "010-1234-5678");
  next();
  await screen.findByLabelText("이름");
  fill("이름", "홍길동");
  next();
  await screen.findByLabelText("비밀번호");
  fill("비밀번호", "password1");
  fill("비밀번호 확인", "password1");
  next();
  await screen.findByLabelText("이메일 (선택)");
  next();
  await screen.findByLabelText("이용약관 동의 (필수)");
}
const submitSignup = () => fireEvent.click(screen.getByRole("button", { name: "가입하기" }));

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ accessToken: null, refreshToken: null, member: null });
  spRef.current = new URLSearchParams();
});
afterEach(() => vi.clearAllMocks());

describe("SignupForm (위저드)", () => {
  it("첫 스텝은 전화번호 질문만 보인다", () => {
    render(<SignupForm />);
    expect(screen.getByRole("heading", { name: "전화번호를 알려주세요" })).toBeDefined();
    expect(screen.getByLabelText("전화번호")).toBeDefined();
    expect(screen.queryByLabelText("이름")).toBeNull();
    expect(screen.queryByLabelText("비밀번호")).toBeNull();
  });

  it("검증 실패 시 다음 스텝으로 진행하지 않는다", async () => {
    render(<SignupForm />);
    fill("전화번호", "123");
    next();
    await waitFor(() =>
      expect(screen.getByText("전화번호 자릿수를 확인해 주세요.")).toBeDefined(),
    );
    expect(screen.queryByLabelText("이름")).toBeNull();
    expect(signupMock).not.toHaveBeenCalled();
  });

  it("이전 버튼으로 돌아가도 입력값이 보존된다", async () => {
    render(<SignupForm />);
    fill("전화번호", "010-1234-5678");
    next();
    await screen.findByLabelText("이름");
    fireEvent.click(screen.getByRole("button", { name: "이전" }));
    const phone = (await screen.findByLabelText("전화번호")) as HTMLInputElement;
    expect(phone.value).toBe("010-1234-5678");
  });

  it("이메일 스텝의 건너뛰기는 이메일 없이 약관 스텝으로 간다", async () => {
    render(<SignupForm />);
    fill("전화번호", "010-1234-5678");
    next();
    await screen.findByLabelText("이름");
    fill("이름", "홍길동");
    next();
    await screen.findByLabelText("비밀번호");
    fill("비밀번호", "password1");
    fill("비밀번호 확인", "password1");
    next();
    await screen.findByLabelText("이메일 (선택)");
    fill("이메일 (선택)", "잘못된값"); // 건너뛰기는 입력을 비우고 진행해야 함
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    await screen.findByLabelText("이용약관 동의 (필수)");
  });

  it("검수2: 약관 미동의 시 제출이 차단된다(signup 미호출)", async () => {
    render(<SignupForm />);
    await completeToTerms();
    submitSignup();
    await waitFor(() => expect(screen.getByText("이용약관에 동의해 주세요.")).toBeDefined());
    expect(screen.getByText("개인정보처리방침에 동의해 주세요.")).toBeDefined();
    expect(signupMock).not.toHaveBeenCalled();
  });

  it("검수3: 가입 성공(201, 토큰 없음) 후 같은 자격으로 자동 로그인한다", async () => {
    signupMock.mockResolvedValue(signupRes);
    loginMock.mockResolvedValue(loginRes);
    render(<SignupForm />);
    await completeToTerms();
    fireEvent.click(screen.getByLabelText("이용약관 동의 (필수)"));
    fireEvent.click(screen.getByLabelText("개인정보처리방침 동의 (필수)"));
    submitSignup();
    await waitFor(() => expect(loginMock).toHaveBeenCalledWith("010-1234-5678", "password1"));
    expect(signupMock).toHaveBeenCalledWith({
      name: "홍길동",
      phone: "010-1234-5678",
      password: "password1",
      email: undefined, // 빈 문자열은 undefined로 변환
      termsAgreed: true,
      privacyAgreed: true,
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("전화번호를 숫자만 입력해도 자동으로 하이픈이 붙어 전송된다", async () => {
    signupMock.mockResolvedValue(signupRes);
    loginMock.mockResolvedValue(loginRes);
    render(<SignupForm />);
    const phone = screen.getByLabelText("전화번호") as HTMLInputElement;
    fireEvent.change(phone, { target: { value: "01012345678" } });
    expect(phone.value).toBe("010-1234-5678"); // 입력칸 표시도 포맷됨
    next();
    await screen.findByLabelText("이름");
    fill("이름", "홍길동");
    next();
    await screen.findByLabelText("비밀번호");
    fill("비밀번호", "password1");
    fill("비밀번호 확인", "password1");
    next();
    await screen.findByLabelText("이메일 (선택)");
    next();
    await screen.findByLabelText("이용약관 동의 (필수)");
    fireEvent.click(screen.getByLabelText("이용약관 동의 (필수)"));
    fireEvent.click(screen.getByLabelText("개인정보처리방침 동의 (필수)"));
    submitSignup();
    await waitFor(() =>
      expect(signupMock).toHaveBeenCalledWith(
        expect.objectContaining({ phone: "010-1234-5678" }),
      ),
    );
  });

  it("자동 로그인 후 next 내부 경로로 복귀한다", async () => {
    spRef.current = new URLSearchParams("next=/gallery");
    signupMock.mockResolvedValue(signupRes);
    loginMock.mockResolvedValue(loginRes);
    render(<SignupForm />);
    await completeToTerms();
    fireEvent.click(screen.getByLabelText("이용약관 동의 (필수)"));
    fireEvent.click(screen.getByLabelText("개인정보처리방침 동의 (필수)"));
    submitSignup();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/gallery"));
  });

  it("자동 로그인 실패 시 /login으로 폴백한다", async () => {
    signupMock.mockResolvedValue(signupRes);
    loginMock.mockRejectedValue(new ApiError(401, "AUTHENTICATION_FAILED", undefined));
    render(<SignupForm />);
    await completeToTerms();
    fireEvent.click(screen.getByLabelText("이용약관 동의 (필수)"));
    fireEvent.click(screen.getByLabelText("개인정보처리방침 동의 (필수)"));
    submitSignup();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("phone 중복(409)은 전화번호 스텝으로 복귀해 필드 에러를 보여준다", async () => {
    signupMock.mockRejectedValue(new ApiError(409, "DUPLICATE_RESOURCE", "이미 존재"));
    render(<SignupForm />);
    await completeToTerms();
    fireEvent.click(screen.getByLabelText("이용약관 동의 (필수)"));
    fireEvent.click(screen.getByLabelText("개인정보처리방침 동의 (필수)"));
    submitSignup();
    await waitFor(() => expect(screen.getByText("이미 가입된 전화번호입니다.")).toBeDefined());
    // 스텝 복귀: 전화번호 입력이 다시 보이고 값 보존
    expect((screen.getByLabelText("전화번호") as HTMLInputElement).value).toBe("010-1234-5678");
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("서버 errors[]는 해당 필드 스텝으로 복귀해 매핑된다(400)", async () => {
    signupMock.mockRejectedValue(
      new ApiError(400, "INVALID_INPUT_VALUE", "입력값 오류", undefined, undefined, [
        { field: "password", reason: "비밀번호 형식이 올바르지 않습니다" },
      ]),
    );
    render(<SignupForm />);
    await completeToTerms();
    fireEvent.click(screen.getByLabelText("이용약관 동의 (필수)"));
    fireEvent.click(screen.getByLabelText("개인정보처리방침 동의 (필수)"));
    submitSignup();
    await waitFor(() =>
      expect(screen.getByText("비밀번호 형식이 올바르지 않습니다")).toBeDefined(),
    );
    expect(screen.getByLabelText("비밀번호")).toBeDefined(); // step 2 복귀
  });

  it("이미 로그인 상태면 홈으로 보낸다(역가드)", () => {
    useAuthStore.setState({ accessToken: "a1", refreshToken: "r1", member: loginRes.member });
    render(<SignupForm />);
    expect(replace).toHaveBeenCalledWith("/");
  });
});
