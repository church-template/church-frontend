import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { createMock, notifyError } = vi.hoisted(() => ({ createMock: vi.fn(), notifyError: vi.fn() }));
vi.mock("@/lib/api/inquiries", () => ({ createInquiry: createMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: notifyError } }));

import { InquirySection } from "./InquirySection";

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

// Reveal이 useEffect에서 matchMedia를 호출 — jsdom 미구현이라 reduced 경로로 스텁(about/* 테스트 관례).
function renderSection() {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
  return render(<InquirySection />);
}

// 유효한 폼을 채운다(이메일은 선택이라 생략 가능).
function fillValidForm() {
  fireEvent.change(screen.getByLabelText("이름 (필수)"), { target: { value: "홍길동" } });
  fireEvent.change(screen.getByLabelText("연락처 (필수)"), { target: { value: "01012345678" } });
  fireEvent.change(screen.getByLabelText("문의 내용 (필수)"), { target: { value: "예배 시간이 궁금합니다." } });
  fireEvent.click(screen.getByLabelText("개인정보 수집·이용 동의 (필수)"));
}

describe("InquirySection", () => {
  it("필수 입력은 라벨에 (필수), 선택 입력은 (선택)으로 표기하고 aria-required를 부여한다", () => {
    renderSection();
    // 라벨 텍스트로 필수 여부를 알린다(별표는 고령 사용자가 놓치기 쉽다).
    for (const label of ["이름 (필수)", "연락처 (필수)", "문의 내용 (필수)", "개인정보 수집·이용 동의 (필수)"]) {
      expect(screen.getByLabelText(label).getAttribute("required")).not.toBeNull();
    }
    expect(screen.getByLabelText("이메일 (선택)").getAttribute("required")).toBeNull();
  });

  it("연락처 입력은 자동 하이픈으로 표시된다", () => {
    renderSection();
    const phone = screen.getByLabelText("연락처 (필수)") as HTMLInputElement;
    fireEvent.change(phone, { target: { value: "01012345678" } });
    expect(phone.value).toBe("010-1234-5678");
  });

  it("문의 내용이 10자 미만이면 제출을 막고 안내한다", async () => {
    renderSection();
    fireEvent.change(screen.getByLabelText("이름 (필수)"), { target: { value: "홍길동" } });
    fireEvent.change(screen.getByLabelText("연락처 (필수)"), { target: { value: "01012345678" } });
    fireEvent.change(screen.getByLabelText("문의 내용 (필수)"), { target: { value: "짧아요" } });
    fireEvent.click(screen.getByLabelText("개인정보 수집·이용 동의 (필수)"));
    fireEvent.click(screen.getByRole("button", { name: "문의 남기기" }));

    await waitFor(() => expect(screen.getByText("문의 내용을 10자 이상 입력해 주세요.")).toBeDefined());
    expect(createMock).not.toHaveBeenCalled();
  });

  it("개인정보 미동의면 제출을 막는다", async () => {
    renderSection();
    fireEvent.change(screen.getByLabelText("이름 (필수)"), { target: { value: "홍길동" } });
    fireEvent.change(screen.getByLabelText("연락처 (필수)"), { target: { value: "01012345678" } });
    fireEvent.change(screen.getByLabelText("문의 내용 (필수)"), { target: { value: "예배 시간이 궁금합니다." } });
    fireEvent.click(screen.getByRole("button", { name: "문의 남기기" }));

    await waitFor(() => expect(screen.getByText("개인정보 수집·이용에 동의해 주세요.")).toBeDefined());
    expect(createMock).not.toHaveBeenCalled();
  });

  it("제출 성공 시 createInquiry를 호출하고 접수번호 패널로 바뀐다", async () => {
    createMock.mockResolvedValue({ id: 12 });
    renderSection();
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "문의 남기기" }));

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith({
        name: "홍길동",
        phone: "010-1234-5678",
        email: undefined,
        content: "예배 시간이 궁금합니다.",
        privacyAgreed: true,
      }),
    );
    await waitFor(() => expect(screen.getByText("문의가 접수되었습니다")).toBeDefined());
    expect(screen.getByText("접수번호 12")).toBeDefined();
    // 폼은 사라진다(중복 제출 방지 + 접수 확인이 확실히 보이게)
    expect(screen.queryByRole("button", { name: "문의 남기기" })).toBeNull();
  });

  it("'다시 문의하기'를 누르면 빈 폼으로 돌아간다", async () => {
    createMock.mockResolvedValue({ id: 12 });
    renderSection();
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "문의 남기기" }));
    await waitFor(() => expect(screen.getByText("문의가 접수되었습니다")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "다시 문의하기" }));

    const name = screen.getByLabelText("이름 (필수)") as HTMLInputElement;
    expect(name.value).toBe("");
  });

  it("서버 오류는 handleApiError로 위임한다(토스트)", async () => {
    const { ApiError } = await import("@/lib/auth/apiError");
    createMock.mockRejectedValue(new ApiError(429, "RATE_LIMIT_EXCEEDED", undefined, "Too Many Requests"));
    renderSection();
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "문의 남기기" }));

    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."),
    );
    // 실패 시 폼은 그대로 남는다(입력 유실 방지)
    expect(screen.getByRole("button", { name: "문의 남기기" })).toBeDefined();
  });

  it("네트워크 오류(순수 Error reject)는 안내 문구를 토스트로 띄운다", async () => {
    createMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderSection();
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "문의 남기기" }));

    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."),
    );
  });
});
