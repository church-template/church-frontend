// src/components/admin/members/MemberDetailDialog.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getMemberMock } = vi.hoisted(() => ({ getMemberMock: vi.fn() }));
vi.mock("@/lib/api/members.admin", () => ({ getMember: getMemberMock }));
// 하위 섹션은 단위 테스트에서 스텁(자체 테스트 보유).
vi.mock("./MemberProfileForm", () => ({ MemberProfileForm: () => <div>profile-form</div> }));
vi.mock("./MemberRolesSection", () => ({ MemberRolesSection: () => <div>roles-section</div> }));
vi.mock("./ResetPasswordSection", () => ({ ResetPasswordSection: () => <div>reset-section</div> }));

import { MemberDetailDialog } from "./MemberDetailDialog";

const detail = { uuid: "u1", name: "홍길동", phone: "010-1234-5678", email: "a@b.com", position: "성도", roles: ["MEMBER"], permissions: ["GALLERY_VIEW"], approved: true, termsAgreed: true, privacyAgreed: false, agreedAt: "2026-02-01T00:00:00", createdAt: "2026-01-01T00:00:00" };

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
const renderDialog = (uuid: string | null) => render(<QueryClientProvider client={qc}><MemberDetailDialog uuid={uuid} open={uuid !== null} onOpenChange={() => {}} /></QueryClientProvider>);

describe("MemberDetailDialog", () => {
  it("상세를 패칭해 승인 Badge·동의 상태·섹션을 렌더", async () => {
    getMemberMock.mockResolvedValue(detail);
    renderDialog("u1");
    await waitFor(() => expect(screen.getByText("profile-form")).toBeDefined());
    expect(screen.getByText("승인")).toBeDefined();
    expect(screen.getByText("개인정보 미동의")).toBeDefined();
    expect(screen.getByText("roles-section")).toBeDefined();
    expect(screen.getByText("reset-section")).toBeDefined();
  });
  it("닫힘(uuid null)이면 getMember를 호출하지 않는다", () => {
    renderDialog(null);
    expect(getMemberMock).not.toHaveBeenCalled();
  });
});
