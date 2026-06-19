import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getMock, deleteMock, notifySuccess, useMeMock } = vi.hoisted(() => ({ getMock: vi.fn(), deleteMock: vi.fn(), notifySuccess: vi.fn(), useMeMock: vi.fn() }));
vi.mock("@/lib/api/roles.admin", () => ({ getRoles: getMock, deleteRole: deleteMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/lib/auth/useMe", () => ({ useMe: useMeMock }));
vi.mock("./RoleFormDialog", () => ({ RoleFormDialog: () => null }));
vi.mock("./RolePermissionsDialog", () => ({ RolePermissionsDialog: () => null }));

import { RoleManager } from "./RoleManager";

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useMeMock.mockReturnValue({ data: { maxPriority: 50 } }); // 기본: 등급 50 운영자
});
afterEach(() => vi.clearAllMocks());
const renderManager = () => render(<QueryClientProvider client={qc}><RoleManager /></QueryClientProvider>);

const sys = { id: 1, name: "최고관리자", priority: 100, isSystem: true, description: "", permissions: [{ id: 1, name: "ROLE_MANAGE", description: "" }] };
const mine = { id: 2, name: "콘텐츠관리자", priority: 50, isSystem: false, description: "", permissions: [{ id: 1, name: "SERMON_WRITE", description: "" }] };
const higher = { id: 3, name: "부목사", priority: 70, isSystem: false, description: "", permissions: [] };

describe("RoleManager", () => {
  it("목록(역할명·우선순위·권한수·시스템 배지) 렌더", async () => {
    getMock.mockResolvedValue([sys, mine]);
    renderManager();
    await waitFor(() => expect(screen.getByText("콘텐츠관리자")).toBeDefined());
    expect(screen.getByText("시스템")).toBeDefined(); // sys 배지
    expect(screen.getByText("100")).toBeDefined();
  });

  it("시스템 역할·상위 등급 역할은 액션 비활성", async () => {
    getMock.mockResolvedValue([sys, higher, mine]);
    renderManager();
    await waitFor(() => expect(screen.getByText("콘텐츠관리자")).toBeDefined());
    expect((screen.getByRole("button", { name: "최고관리자 수정" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "부목사 삭제" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "콘텐츠관리자 수정" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("삭제 확인 후 deleteRole 호출", async () => {
    getMock.mockResolvedValue([mine]);
    deleteMock.mockResolvedValue(undefined);
    renderManager();
    await waitFor(() => expect(screen.getByText("콘텐츠관리자")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "콘텐츠관리자 삭제" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "삭제" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(2));
  });

  it("빈 목록 안내", async () => {
    getMock.mockResolvedValue([]);
    renderManager();
    await waitFor(() => expect(screen.getByText("등록된 역할이 없습니다.")).toBeDefined());
  });

  it("me 미로딩(maxPriority 미정)이면 시스템 역할만 비활성, 상위 등급 포함 나머지는 활성", async () => {
    useMeMock.mockReturnValue({ data: undefined }); // 로딩 전 — 등급 미정
    getMock.mockResolvedValue([sys, higher, mine]);
    renderManager();
    await waitFor(() => expect(screen.getByText("콘텐츠관리자")).toBeDefined());
    expect((screen.getByRole("button", { name: "최고관리자 수정" }) as HTMLButtonElement).disabled).toBe(true); // 시스템 → 비활성
    expect((screen.getByRole("button", { name: "부목사 수정" }) as HTMLButtonElement).disabled).toBe(false); // 상위지만 등급 미정 → 활성(서버 위임)
    expect((screen.getByRole("button", { name: "콘텐츠관리자 수정" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
