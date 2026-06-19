import { describe, it, expect, vi, afterEach } from "vitest";

const { authFetchMock, parseJsonMock, apiMutateMock } = vi.hoisted(() => ({
  authFetchMock: vi.fn(), parseJsonMock: vi.fn(), apiMutateMock: vi.fn(),
}));
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));
vi.mock("@/lib/auth/apiError", () => ({ parseJson: parseJsonMock }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { getRoles, createRole, patchRole, deleteRole, setRolePermissions } from "./roles.admin";

afterEach(() => vi.clearAllMocks());

describe("역할 어드민 API", () => {
  it("getRoles는 GET /api/admin/roles 파싱 결과를 반환한다", async () => {
    const res = {} as Response;
    authFetchMock.mockResolvedValue(res);
    parseJsonMock.mockResolvedValue([{ id: 1, name: "관리자", priority: 50, isSystem: false, description: "", permissions: [] }]);
    const out = await getRoles();
    expect(authFetchMock).toHaveBeenCalledWith("/api/admin/roles");
    expect(parseJsonMock).toHaveBeenCalledWith(res);
    expect(out[0].name).toBe("관리자");
  });
  it("createRole은 POST로 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 2 });
    await createRole({ name: "교사", priority: 30, description: "주일학교" });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/roles", { method: "POST", body: { name: "교사", priority: 30, description: "주일학교" } });
  });
  it("patchRole은 PATCH로 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 2 });
    await patchRole(2, { name: "교사", priority: 20 });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/roles/2", { method: "PATCH", body: { name: "교사", priority: 20 } });
  });
  it("deleteRole은 DELETE를 호출한다", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteRole(2);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/roles/2", { method: "DELETE" });
  });
  it("setRolePermissions는 PUT으로 {permissions:[names]}를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 2 });
    await setRolePermissions(2, ["SERMON_WRITE", "NOTICE_WRITE"]);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/roles/2/permissions", { method: "PUT", body: { permissions: ["SERMON_WRITE", "NOTICE_WRITE"] } });
  });
});
