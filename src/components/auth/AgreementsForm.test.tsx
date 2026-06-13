// src/components/auth/AgreementsForm.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getMock, patchMock, replace, spRef } = vi.hoisted(() => ({
  getMock: vi.fn(),
  patchMock: vi.fn(),
  replace: vi.fn(),
  spRef: { current: new URLSearchParams() },
}));
vi.mock("@/lib/auth/agreementsApi", () => ({
  getMyAgreements: getMock,
  updateMyAgreements: patchMock,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => spRef.current,
}));

import { AgreementsForm } from "./AgreementsForm";
import { useAuthStore } from "@/lib/auth/authStore";

let qc: QueryClient;
function renderForm() {
  return render(
    <QueryClientProvider client={qc}>
      <AgreementsForm />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  localStorage.clear();
  useAuthStore.setState({ accessToken: "a1", refreshToken: "r1", member: null });
  spRef.current = new URLSearchParams();
  getMock.mockResolvedValue({ termsAgreed: true, privacyAgreed: false, agreedAt: null });
});
afterEach(() => vi.clearAllMocks());

describe("AgreementsForm", () => {
  it("비로그인 진입은 /login?next=/agreements로 보낸다(가드)", () => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, member: null });
    renderForm();
    expect(replace).toHaveBeenCalledWith("/login?next=/agreements");
  });

  it("GET 결과를 체크박스 초기값에 반영하고, 둘 다 체크 전엔 제출이 비활성이다", async () => {
    renderForm();
    const terms = (await screen.findByLabelText("이용약관 동의 (필수)")) as HTMLInputElement;
    const privacy = screen.getByLabelText("개인정보처리방침 동의 (필수)") as HTMLInputElement;
    await waitFor(() => expect(terms.checked).toBe(true)); // 이미 동의한 항목 유지
    expect(privacy.checked).toBe(false);
    const button = screen.getByRole("button", { name: "동의하고 계속하기" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("검수: 둘 다 체크하면 PATCH 후 next로 이동하고 me 캐시를 무효화한다", async () => {
    spRef.current = new URLSearchParams("next=/gallery");
    patchMock.mockResolvedValue({ termsAgreed: true, privacyAgreed: true, agreedAt: "2026-06-12T00:00:00" });
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    renderForm();
    const privacy = await screen.findByLabelText("개인정보처리방침 동의 (필수)");
    fireEvent.click(privacy);
    const button = screen.getByRole("button", { name: "동의하고 계속하기" }) as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
    fireEvent.click(button);
    await waitFor(() =>
      expect(patchMock).toHaveBeenCalledWith({ termsAgreed: true, privacyAgreed: true }),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/gallery"));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["me"] });
  });

  it("next가 없으면 홈으로 이동한다", async () => {
    patchMock.mockResolvedValue({ termsAgreed: true, privacyAgreed: true, agreedAt: "2026-06-12T00:00:00" });
    renderForm();
    fireEvent.click(await screen.findByLabelText("개인정보처리방침 동의 (필수)"));
    const button = screen.getByRole("button", { name: "동의하고 계속하기" }) as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
    fireEvent.click(button);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("GET 실패 시 안내 문구를 보여준다", async () => {
    getMock.mockRejectedValue(new Error("network"));
    renderForm();
    expect(
      await screen.findByText("동의 상태를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요."),
    ).toBeDefined();
  });
});
