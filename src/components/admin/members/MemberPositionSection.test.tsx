// src/components/admin/members/MemberPositionSection.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getPositionsMock, changeMock, useHasPermMock, notifySuccess } = vi.hoisted(() => ({
  getPositionsMock: vi.fn(), changeMock: vi.fn(), useHasPermMock: vi.fn(), notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/positions", () => ({ getPositions: getPositionsMock }));
vi.mock("@/lib/api/members.admin", () => ({ changePosition: changeMock }));
vi.mock("@/lib/auth/useMe", () => ({ useHasPermission: useHasPermMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));

import { MemberPositionSection } from "./MemberPositionSection";

const positions = [
  { id: 1, name: "목사", sortOrder: 10, createdAt: "2026-01-01T00:00:00" },
  { id: 2, name: "장로", sortOrder: 20, createdAt: "2026-01-01T00:00:00" },
];
const base = { uuid: "u1", name: "홍길동", phone: "", email: "", position: "목사", roles: [], permissions: [], approved: true, termsAgreed: true, privacyAgreed: true, agreedAt: null, createdAt: "2026-01-01T00:00:00" };

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useHasPermMock.mockReturnValue(true);
  getPositionsMock.mockResolvedValue(positions);
});
afterEach(() => vi.clearAllMocks());
const renderSection = (m = base) => render(<QueryClientProvider client={qc}><MemberPositionSection member={m} /></QueryClientProvider>);

describe("MemberPositionSection", () => {
  it("현재 직분이 select에 시드된다", async () => {
    renderSection();
    await waitFor(() => expect((screen.getByLabelText("직분 선택") as HTMLSelectElement).value).toBe("1"));
  });
  it("다른 직분 선택 후 변경 → changePosition(uuid, id) 호출", async () => {
    changeMock.mockResolvedValue({ ...base, position: "장로" });
    renderSection();
    await waitFor(() => expect((screen.getByLabelText("직분 선택") as HTMLSelectElement).value).toBe("1"));
    fireEvent.change(screen.getByLabelText("직분 선택"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "변경" }));
    await waitFor(() => expect(changeMock).toHaveBeenCalledWith("u1", 2));
  });
  it("(없음) 선택 후 변경 → changePosition(uuid, null)로 해제", async () => {
    changeMock.mockResolvedValue({ ...base, position: "" });
    renderSection();
    await waitFor(() => expect((screen.getByLabelText("직분 선택") as HTMLSelectElement).value).toBe("1"));
    fireEvent.change(screen.getByLabelText("직분 선택"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "변경" }));
    await waitFor(() => expect(changeMock).toHaveBeenCalledWith("u1", null));
  });
  it("MEMBER_MANAGE 미보유면 select 비노출, 직분 이름만 표시", async () => {
    useHasPermMock.mockReturnValue(false);
    renderSection();
    await waitFor(() => expect(screen.getByText("목사")).toBeDefined());
    expect(screen.queryByLabelText("직분 선택")).toBeNull();
  });
  it("카탈로그에 없는 직분이면 (없음)으로 폴백", async () => {
    renderSection({ ...base, position: "권사" }); // positions에 없음
    await waitFor(() => expect((screen.getByLabelText("직분 선택") as HTMLSelectElement).value).toBe(""));
  });
});
