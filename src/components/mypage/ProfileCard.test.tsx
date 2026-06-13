import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ProfileCard가 토글 시 ProfileEditForm을 렌더 → 그 의존(authApi·notify)을 안전화.
vi.mock("@/lib/auth/authApi", () => ({ updateMe: vi.fn() }));
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

import { ProfileCard } from "./ProfileCard";

const base = {
  uuid: "u1", name: "홍길동", phone: "01012345678", email: "hong@example.com", position: "집사",
  roles: ["MEMBER"], permissions: ["SERMON_WRITE"], maxPriority: 0,
  termsAgreed: true, privacyAgreed: true, agreedAt: null,
};
let qc: QueryClient;
function renderCard(me = base) {
  return render(
    <QueryClientProvider client={qc}>
      <ProfileCard me={me} />
    </QueryClientProvider>,
  );
}
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());

describe("ProfileCard", () => {
  it("이름·전화·직분·권한칩·교인 배지를 표시한다", () => {
    renderCard();
    expect(screen.getByRole("heading", { name: "홍길동" })).toBeDefined();
    expect(screen.getByText("01012345678")).toBeDefined();
    expect(screen.getByText("집사")).toBeDefined();
    expect(screen.getByText("설교 관리")).toBeDefined();
    expect(screen.getByText("교인")).toBeDefined();
  });

  it("MEMBER 미보유는 승인 대기 배지", () => {
    renderCard({ ...base, roles: ["USER"] });
    expect(screen.getByText("승인 대기")).toBeDefined();
  });

  it("권한이 없으면 이용 권한 섹션을 생략한다", () => {
    renderCard({ ...base, permissions: [] });
    expect(screen.queryByText("이용 권한")).toBeNull();
  });

  it("수정 클릭 시 편집 폼으로 전환한다", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    expect(screen.getByLabelText("이름")).toBeDefined();
  });
});
