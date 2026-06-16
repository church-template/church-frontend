import { describe, it, expect, vi, afterEach } from "vitest";

const { authFetchMock, apiMutateMock } = vi.hoisted(() => ({
  authFetchMock: vi.fn(),
  apiMutateMock: vi.fn(),
}));
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import {
  listDepartmentsAdmin,
  getDepartmentDetail,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "./departments.admin";

afterEach(() => vi.clearAllMocks());
const ok = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body, clone() { return this; } } as unknown as Response);

describe("부서 어드민 API", () => {
  it("listDepartmentsAdmin은 공개 평배열을 no-store로 읽는다", async () => {
    authFetchMock.mockResolvedValue(
      ok([{ id: 1, name: "학생부", leader: "", parentId: null, sortOrder: 10 }]),
    );
    const list = await listDepartmentsAdmin();
    expect(authFetchMock).toHaveBeenCalledWith("/api/departments", { cache: "no-store" });
    expect(list[0].name).toBe("학생부");
  });

  it("getDepartmentDetail은 상세를 no-store로 읽는다", async () => {
    authFetchMock.mockResolvedValue(
      ok({ id: 5, name: "중등부", description: "", leader: "", parentId: 1, sortOrder: 10, createdAt: "", updatedAt: "", version: 3 }),
    );
    const d = await getDepartmentDetail(5);
    expect(authFetchMock).toHaveBeenCalledWith("/api/departments/5", { cache: "no-store" });
    expect(d.version).toBe(3);
  });

  it("createDepartment은 POST로 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 9 });
    await createDepartment({ name: "청년부", parentId: null });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/departments", {
      method: "POST",
      body: { name: "청년부", parentId: null },
    });
  });

  it("updateDepartment은 PUT로 version 포함 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 9 });
    await updateDepartment(9, { name: "청년부", parentId: null, version: 2 });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/departments/9", {
      method: "PUT",
      body: { name: "청년부", parentId: null, version: 2 },
    });
  });

  it("deleteDepartment은 DELETE를 호출한다", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteDepartment(9);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/departments/9", { method: "DELETE" });
  });
});
