import { describe, it, expect, vi, afterEach } from "vitest";

const { authFetchMock, parseJsonMock, apiMutateMock } = vi.hoisted(() => ({
  authFetchMock: vi.fn(), parseJsonMock: vi.fn(), apiMutateMock: vi.fn(),
}));
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));
vi.mock("@/lib/auth/apiError", () => ({ parseJson: parseJsonMock }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { listMembers, getMember, updateMember, grantRole, revokeRole, resetPassword, changePosition } from "./members.admin";

afterEach(() => vi.clearAllMocks());

describe("회원 어드민 API", () => {
  it("listMembers는 GET /api/members 에 q·page 쿼리를 조립한다(admin 미접두)", async () => {
    const res = {} as Response;
    authFetchMock.mockResolvedValue(res);
    parseJsonMock.mockResolvedValue({ content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } });
    await listMembers({ q: "010", page: 2 });
    expect(authFetchMock).toHaveBeenCalledWith("/api/members?q=010&page=2");
    expect(parseJsonMock).toHaveBeenCalledWith(res);
  });
  it("listMembers는 파라미터가 없으면 쿼리 없이 호출한다", async () => {
    authFetchMock.mockResolvedValue({} as Response);
    parseJsonMock.mockResolvedValue({ content: [], page: {} });
    await listMembers();
    expect(authFetchMock).toHaveBeenCalledWith("/api/members");
  });
  it("getMember는 GET /api/members/{uuid}", async () => {
    authFetchMock.mockResolvedValue({} as Response);
    parseJsonMock.mockResolvedValue({ uuid: "u1" });
    await getMember("u1");
    expect(authFetchMock).toHaveBeenCalledWith("/api/members/u1");
  });
  it("updateMember는 PATCH /api/admin/members/{uuid}", async () => {
    apiMutateMock.mockResolvedValue({ uuid: "u1" });
    await updateMember("u1", { name: "새이름", phone: "010-1111-2222", email: "" });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/members/u1", { method: "PATCH", body: { name: "새이름", phone: "010-1111-2222", email: "" } });
  });
  it("grantRole는 POST .../roles {roleId}", async () => {
    apiMutateMock.mockResolvedValue({ uuid: "u1" });
    await grantRole("u1", 5);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/members/u1/roles", { method: "POST", body: { roleId: 5 } });
  });
  it("revokeRole는 DELETE .../roles/{roleId}", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await revokeRole("u1", 5);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/members/u1/roles/5", { method: "DELETE" });
  });
  it("resetPassword는 POST .../reset-password, temporaryPassword 반환", async () => {
    apiMutateMock.mockResolvedValue({ temporaryPassword: "Temp!234" });
    const out = await resetPassword("u1");
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/members/u1/reset-password", { method: "POST" });
    expect(out.temporaryPassword).toBe("Temp!234");
  });
  it("changePosition는 PUT .../position {positionId} 로 부여한다", async () => {
    apiMutateMock.mockResolvedValue({ uuid: "u1", position: "목사" });
    await changePosition("u1", 3);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/members/u1/position", { method: "PUT", body: { positionId: 3 } });
  });
  it("changePosition는 positionId=null 로 해제한다", async () => {
    apiMutateMock.mockResolvedValue({ uuid: "u1", position: "" });
    await changePosition("u1", null);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/members/u1/position", { method: "PUT", body: { positionId: null } });
  });
});
