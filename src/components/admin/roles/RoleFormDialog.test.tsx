import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { createMock, patchMock, notifySuccess } = vi.hoisted(() => ({ createMock: vi.fn(), patchMock: vi.fn(), notifySuccess: vi.fn() }));
vi.mock("@/lib/api/roles.admin", () => ({ createRole: createMock, patchRole: patchMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/lib/auth/useMe", () => ({ useMe: () => ({ data: { maxPriority: 50 } }) }));

import { RoleFormDialog } from "./RoleFormDialog";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
const renderDialog = (ui: React.ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

describe("RoleFormDialog", () => {
  it("등록: name·priority·description을 createRole에 전달", async () => {
    createMock.mockResolvedValue({ id: 1 });
    renderDialog(<RoleFormDialog open mode="create" onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "교사" } });
    fireEvent.change(screen.getByLabelText("우선순위"), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText("설명(선택)"), { target: { value: "주일학교" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createMock).toHaveBeenCalledWith({ name: "교사", priority: 30, description: "주일학교" }));
  });

  it("등록: priority가 내 등급(50) 초과면 차단", async () => {
    renderDialog(<RoleFormDialog open mode="create" onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "상위" } });
    fireEvent.change(screen.getByLabelText("우선순위"), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("내 등급보다 높게 만들 수 없습니다.")).toBeDefined());
    expect(createMock).not.toHaveBeenCalled();
  });

  it("수정: initial 시드 후 patchRole 호출 + ['roles']·['me'] 무효화", async () => {
    patchMock.mockResolvedValue({ id: 5 });
    const spy = vi.spyOn(qc, "invalidateQueries");
    renderDialog(
      <RoleFormDialog open mode="edit" onOpenChange={() => {}}
        initial={{ id: 5, name: "교사", priority: 30, isSystem: false, description: "주일학교", permissions: [] }} />,
    );
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "수석교사" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(patchMock).toHaveBeenCalledWith(5, { name: "수석교사", priority: 30, description: "주일학교" }));
    expect(spy).toHaveBeenCalledWith({ queryKey: ["admin", "roles", "list", undefined] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["me"] });
  });

  it("등록(create)은 ['me']를 무효화하지 않는다", async () => {
    createMock.mockResolvedValue({ id: 1 });
    const spy = vi.spyOn(qc, "invalidateQueries");
    renderDialog(<RoleFormDialog open mode="create" onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "교사" } });
    fireEvent.change(screen.getByLabelText("우선순위"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith({ queryKey: ["admin", "roles", "list", undefined] });
    expect(spy).not.toHaveBeenCalledWith({ queryKey: ["me"] });
  });
});
