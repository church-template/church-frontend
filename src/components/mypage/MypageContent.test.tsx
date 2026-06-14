// src/components/mypage/MypageContent.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { signOutMock, replace, useMeMock, refetch } = vi.hoisted(() => ({
  signOutMock: vi.fn(async () => {}),
  replace: vi.fn(),
  useMeMock: vi.fn(),
  refetch: vi.fn(),
}));
vi.mock("@/lib/auth/authApi", () => ({ signOut: signOutMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));
vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock }));
// 오케스트레이션에 집중 — 무거운 자식은 자리표시로 대체.
vi.mock("./ProfileCard", () => ({ ProfileCard: () => <div>ProfileCard</div> }));
vi.mock("./PasswordChangeSection", () => ({ PasswordChangeSection: () => <div>PasswordChangeSection</div> }));
vi.mock("./AgreementStatus", () => ({ AgreementStatus: () => <div>AgreementStatus</div> }));
vi.mock("./WithdrawDialog", () => ({ WithdrawDialog: () => <div>WithdrawDialog</div> }));
// Reveal은 window.matchMedia·IntersectionObserver 의존 — jsdom에서 오케스트레이션 무관 자식이라 stub.
vi.mock("@/components/main/Reveal", () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { MypageContent } from "./MypageContent";
import { useAuthStore } from "@/lib/auth/authStore";

const me = {
  uuid: "u1", name: "홍길동", phone: "01012345678", email: "", position: "집사",
  roles: ["MEMBER"], permissions: [], maxPriority: 0,
  termsAgreed: true, privacyAgreed: true, agreedAt: null,
};
let qc: QueryClient;
function renderContent() {
  return render(
    <QueryClientProvider client={qc}>
      <MypageContent />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  localStorage.clear();
  useAuthStore.setState({ accessToken: "a1", refreshToken: "r1", member: { uuid: "u1", name: "홍길동", phone: "01012345678", position: "집사", roles: ["MEMBER"] } });
  useMeMock.mockReturnValue({ data: me, isPending: false, isError: false, refetch });
});
afterEach(() => vi.clearAllMocks());

describe("MypageContent", () => {
  it("토큰 없으면(스냅샷만 있어도) /login?next=/mypage로 보낸다", () => {
    useAuthStore.setState({ accessToken: null });
    renderContent();
    expect(replace).toHaveBeenCalledWith("/login?next=/mypage");
  });

  it("성공 시 프로필·비번·약관·탈퇴 섹션과 로그아웃을 렌더한다", () => {
    renderContent();
    expect(screen.getByRole("heading", { level: 1, name: "마이페이지" })).toBeDefined();
    expect(screen.getByText("ProfileCard")).toBeDefined();
    expect(screen.getByText("PasswordChangeSection")).toBeDefined();
    expect(screen.getByText("AgreementStatus")).toBeDefined();
    expect(screen.getByText("WithdrawDialog")).toBeDefined();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeDefined();
  });

  it("에러 시 다시 시도 버튼으로 refetch한다", () => {
    useMeMock.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch });
    renderContent();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("로그아웃 클릭 시 signOut 후 me 캐시를 제거하고 홈으로 이동한다", async () => {
    const removeSpy = vi.spyOn(qc, "removeQueries");
    renderContent();
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ["me"] });
  });

  it("관리 권한 보유 회원에게 관리 허브가 노출된다", () => {
    useMeMock.mockReturnValue({
      data: { ...me, permissions: ["SERMON_WRITE"] },
      isPending: false,
      isError: false,
      refetch,
    });
    renderContent();
    expect(screen.getByText("관리")).toBeDefined();
    expect(screen.getByText("설교 관리")).toBeDefined();
  });

  it("관리 권한이 없으면 관리 허브가 노출되지 않는다", () => {
    renderContent(); // beforeEach 기본 me.permissions = []
    expect(screen.getByRole("heading", { level: 1, name: "마이페이지" })).toBeDefined();
    expect(screen.queryByText("관리")).toBeNull();
  });
});
