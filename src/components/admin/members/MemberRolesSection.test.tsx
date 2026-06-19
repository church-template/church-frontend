// src/components/admin/members/MemberRolesSection.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getRolesMock, grantMock, revokeMock, useMeMock, useHasPermMock, notifySuccess } = vi.hoisted(() => ({
  getRolesMock: vi.fn(), grantMock: vi.fn(), revokeMock: vi.fn(), useMeMock: vi.fn(), useHasPermMock: vi.fn(), notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/roles.admin", () => ({ getRoles: getRolesMock }));
vi.mock("@/lib/api/members.admin", () => ({ grantRole: grantMock, revokeRole: revokeMock }));
vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock, useHasPermission: useHasPermMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));

import { MemberRolesSection } from "./MemberRolesSection";

const roles = [
  { id: 1, name: "MEMBER", priority: 10, isSystem: true, description: "", permissions: [] },
  { id: 2, name: "콘텐츠관리", priority: 40, isSystem: false, description: "", permissions: [] },
  { id: 3, name: "ADMIN", priority: 90, isSystem: false, description: "", permissions: [] },
];
const member = { uuid: "u1", name: "홍길동", phone: "", email: "", position: "", roles: ["MEMBER"], permissions: [], approved: true, termsAgreed: true, privacyAgreed: true, agreedAt: null, createdAt: "2026-01-01T00:00:00" };

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useMeMock.mockReturnValue({ data: { uuid: "admin-uuid", maxPriority: 50 } });
  useHasPermMock.mockReturnValue(true);
  getRolesMock.mockResolvedValue(roles);
});
afterEach(() => vi.clearAllMocks());
const renderSection = (m = member) => render(<QueryClientProvider client={qc}><MemberRolesSection member={m} /></QueryClientProvider>);

describe("MemberRolesSection", () => {
  it("부여 후보는 내 등급 미만 && 미보유만(동급 ADMIN 제외, 보유 MEMBER 제외)", async () => {
    renderSection();
    await waitFor(() => expect(screen.getByRole("option", { name: "콘텐츠관리" })).toBeDefined());
    expect(screen.queryByRole("option", { name: "ADMIN" })).toBeNull(); // priority 90 >= 50 → 제외
    expect(screen.queryByRole("option", { name: "MEMBER" })).toBeNull(); // 이미 보유 → 제외
  });
  it("부여 선택 후 부여 버튼 → grantRole 호출", async () => {
    grantMock.mockResolvedValue({ ...member, roles: ["MEMBER", "콘텐츠관리"] });
    renderSection();
    await waitFor(() => expect(screen.getByRole("option", { name: "콘텐츠관리" })).toBeDefined());
    fireEvent.change(screen.getByLabelText("부여할 역할"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "부여" }));
    await waitFor(() => expect(grantMock).toHaveBeenCalledWith("u1", 2));
  });
  it("ROLE_MANAGE 미보유면 부여 컨트롤을 렌더하지 않는다", async () => {
    useHasPermMock.mockReturnValue(false);
    renderSection();
    await waitFor(() => expect(screen.getByText("MEMBER")).toBeDefined());
    expect(screen.queryByLabelText("부여할 역할")).toBeNull();
  });
  it("자기 자신이면 변경 비활성", async () => {
    useMeMock.mockReturnValue({ data: { uuid: "u1", maxPriority: 50 } }); // member.uuid와 동일
    renderSection();
    await waitFor(() => expect(screen.getByText("자기 자신의 역할은 변경할 수 없습니다.")).toBeDefined());
    expect((screen.getByRole("button", { name: "부여" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
