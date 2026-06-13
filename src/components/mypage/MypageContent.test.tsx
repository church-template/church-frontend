// src/components/mypage/MypageContent.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { signOutMock, replace } = vi.hoisted(() => ({
  signOutMock: vi.fn(async () => {}),
  replace: vi.fn(),
}));
vi.mock("@/lib/auth/authApi", () => ({ signOut: signOutMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

import { MypageContent } from "./MypageContent";
import { useAuthStore } from "@/lib/auth/authStore";

const member = {
  uuid: "u1",
  name: "홍길동",
  phone: "01012345678",
  position: "성도",
  roles: ["USER"],
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
  useAuthStore.setState({ accessToken: "a1", refreshToken: "r1", member });
});
afterEach(() => vi.clearAllMocks());

describe("MypageContent", () => {
  it("비로그인 진입은 /login?next=/mypage로 보낸다(가드)", () => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, member: null });
    renderContent();
    expect(replace).toHaveBeenCalledWith("/login?next=/mypage");
  });

  it("제목과 로그아웃 버튼을 렌더한다", () => {
    renderContent();
    expect(screen.getByRole("heading", { level: 1, name: "마이페이지" })).toBeDefined();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeDefined();
  });

  it("로그아웃 클릭 시 signOut 후 me 캐시를 제거하고 홈으로 이동한다", async () => {
    const removeSpy = vi.spyOn(qc, "removeQueries");
    renderContent();
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ["me"] });
  });
});
