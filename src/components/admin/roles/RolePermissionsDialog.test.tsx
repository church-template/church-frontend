import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getPermsMock, setPermsMock, notifySuccess } = vi.hoisted(() => ({ getPermsMock: vi.fn(), setPermsMock: vi.fn(), notifySuccess: vi.fn() }));
vi.mock("@/lib/api/permissions.admin", () => ({ getPermissions: getPermsMock }));
vi.mock("@/lib/api/roles.admin", () => ({ setRolePermissions: setPermsMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));

import { RolePermissionsDialog } from "./RolePermissionsDialog";
import type { RoleResponse } from "@/lib/api/roles.admin";

const role: RoleResponse = { id: 7, name: "교사", priority: 30, isSystem: false, description: "", permissions: [{ id: 1, name: "SERMON_WRITE", description: "설교 관리" }] };

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  getPermsMock.mockResolvedValue([
    { id: 1, name: "SERMON_WRITE", description: "설교 관리" },
    { id: 2, name: "NOTICE_WRITE", description: "공지 관리" },
  ]);
});
afterEach(() => vi.clearAllMocks());
const renderDialog = () => render(<QueryClientProvider client={qc}><RolePermissionsDialog open role={role} onOpenChange={() => {}} /></QueryClientProvider>);

describe("RolePermissionsDialog", () => {
  it("카탈로그를 렌더하고 역할 보유 권한으로 초기 체크 시드", async () => {
    renderDialog();
    await waitFor(() => expect(screen.getByLabelText("설교 관리")).toBeDefined());
    expect((screen.getByLabelText("설교 관리") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("공지 관리") as HTMLInputElement).checked).toBe(false);
  });

  it("토글 후 저장하면 선택된 권한 이름 배열로 setRolePermissions 호출", async () => {
    setPermsMock.mockResolvedValue({ id: 7 });
    renderDialog();
    await waitFor(() => expect(screen.getByLabelText("공지 관리")).toBeDefined());
    fireEvent.click(screen.getByText("공지 관리"));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(setPermsMock).toHaveBeenCalledWith(7, ["SERMON_WRITE", "NOTICE_WRITE"]));
  });

  it("전체 해제 후 저장하면 빈 배열 PUT", async () => {
    setPermsMock.mockResolvedValue({ id: 7 });
    renderDialog();
    await waitFor(() => expect(screen.getByLabelText("설교 관리")).toBeDefined());
    fireEvent.click(screen.getByText("설교 관리"));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(setPermsMock).toHaveBeenCalledWith(7, []));
  });
});
