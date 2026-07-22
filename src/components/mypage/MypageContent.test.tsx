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
// MyChallengeHistory는 useHasPermission·useMyParticipations를 직접 호출 — 이 파일이 "@/lib/auth/useMe"를
// 전체 목킹(useMe만 export)하므로 실물을 쓰면 useHasPermission 미정의로 깨진다. 오케스트레이션 무관 자식이라 stub.
vi.mock("./MyChallengeHistory", () => ({ MyChallengeHistory: () => <div>MyChallengeHistory</div> }));
vi.mock("./MyVehicleBoardings", () => ({ MyVehicleBoardings: () => <div>MyVehicleBoardings</div> }));
// Reveal은 window.matchMedia·IntersectionObserver 의존 — jsdom에서 오케스트레이션 무관 자식이라 stub.
vi.mock("@/components/main/Reveal", () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { MypageContent } from "./MypageContent";
import { useAuthStore } from "@/lib/auth/authStore";
import { ApiError } from "@/lib/auth/apiError";

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

  // DB 초기화·서버측 토큰 회수 등으로 라이브 세션이 죽으면 /me가 401/403으로 떨어진다.
  // persist된 member 스냅샷 탓에 마이페이지에 갇히지 않도록 세션을 비우고 로그인으로 보낸다(self-heal).
  it("/me가 401(세션 만료)이면 세션을 비우고 로그인으로 보낸다", async () => {
    useMeMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new ApiError(401, "INVALID_TOKEN", "유효하지 않은 토큰입니다"),
      refetch,
    });
    const removeSpy = vi.spyOn(qc, "removeQueries");
    renderContent();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login?next=/mypage"));
    expect(useAuthStore.getState().member).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ["me"] });
  });

  // 인증 외 에러(5xx·네트워크)는 세션이 살아있을 수 있어 자동 로그아웃하지 않되,
  // 사용자가 직접 빠져나갈 수 있도록 로그아웃 탈출구를 함께 제공한다(에러 화면에 갇히지 않게).
  it("인증 외 에러면 자동 이동 없이 다시 시도와 로그아웃을 함께 제공한다", () => {
    useMeMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new ApiError(500, "INTERNAL_ERROR", "서버 오류"),
      refetch,
    });
    renderContent();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeDefined();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeDefined();
    expect(replace).not.toHaveBeenCalled();
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
