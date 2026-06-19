import { describe, it, expect, vi, afterEach } from "vitest";

const { authFetchMock, parseJsonMock } = vi.hoisted(() => ({ authFetchMock: vi.fn(), parseJsonMock: vi.fn() }));
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));
vi.mock("@/lib/auth/apiError", () => ({ parseJson: parseJsonMock }));

import { getPermissions } from "./permissions.admin";

afterEach(() => vi.clearAllMocks());

describe("권한 카탈로그 API", () => {
  it("getPermissions는 GET /api/admin/permissions를 호출하고 파싱 결과를 반환한다", async () => {
    const res = {} as Response;
    authFetchMock.mockResolvedValue(res);
    parseJsonMock.mockResolvedValue([{ id: 1, name: "ROLE_MANAGE", description: "역할·권한 관리" }]);
    const out = await getPermissions();
    expect(authFetchMock).toHaveBeenCalledWith("/api/admin/permissions");
    expect(parseJsonMock).toHaveBeenCalledWith(res);
    expect(out[0].name).toBe("ROLE_MANAGE");
  });
});
