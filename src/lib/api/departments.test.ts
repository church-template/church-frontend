import { describe, it, expect, vi, afterEach } from "vitest";
import { getDepartments, getDepartment, buildDepartmentTree, bySortOrder } from "./departments";
import type { DepartmentCardResponse } from "./types";

afterEach(() => vi.unstubAllGlobals());

const okJson = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;

const card = (over: Partial<DepartmentCardResponse>): DepartmentCardResponse => ({
  id: 1, name: "부서", leader: "", parentId: null, sortOrder: 0, ...over,
});

describe("getDepartments", () => {
  it("'/api/departments'를 revalidate 60으로 호출한다", async () => {
    const spy = vi.fn(async () => okJson([]));
    vi.stubGlobal("fetch", spy);
    await getDepartments();
    expect(spy).toHaveBeenCalledWith("/api/departments", { next: { revalidate: 60 } });
  });

  it("null 응답은 빈 배열로 방어한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson(null)));
    expect(await getDepartments()).toEqual([]);
  });

  it("비 200이면 throw한다(error.tsx 위임)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    await expect(getDepartments()).rejects.toThrow("GET /api/departments 실패: 500");
  });
});

describe("getDepartment", () => {
  it("상세를 반환한다", async () => {
    const detail = { ...card({ id: 7, name: "청년부" }), description: "본문", createdAt: "", updatedAt: "", version: 1 };
    vi.stubGlobal("fetch", vi.fn(async () => okJson(detail)));
    expect(await getDepartment(7)).toMatchObject({ id: 7, name: "청년부", description: "본문" });
  });

  it("404는 null을 반환한다(미존재)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 }) as Response));
    expect(await getDepartment(999)).toBeNull();
  });

  it("그 외 비 200은 throw한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    await expect(getDepartment(7)).rejects.toThrow("GET /api/departments/7 실패: 500");
  });
});

describe("buildDepartmentTree", () => {
  it("parentId로 자식을 중첩하고 sortOrder,id로 정렬한다", () => {
    const list = [
      card({ id: 1, name: "교회학교", sortOrder: 1 }),
      card({ id: 3, name: "초등부", parentId: 1, sortOrder: 2 }),
      card({ id: 2, name: "유치부", parentId: 1, sortOrder: 1 }),
    ];
    const roots = buildDepartmentTree(list);
    expect(roots.map((r) => r.id)).toEqual([1]);
    expect(roots[0].children.map((c) => c.name)).toEqual(["유치부", "초등부"]);
  });

  it("부모 없는 parentId(고아)는 루트로 승격한다", () => {
    const roots = buildDepartmentTree([card({ id: 5, name: "고아", parentId: 99 })]);
    expect(roots.map((r) => r.id)).toEqual([5]);
  });

  it("입력 배열을 변형하지 않는다(불변)", () => {
    const list = [card({ id: 1 }), card({ id: 2, parentId: 1 })];
    const snapshot = JSON.stringify(list);
    buildDepartmentTree(list);
    expect(JSON.stringify(list)).toBe(snapshot);
  });

  it("bySortOrder는 sortOrder 후 id로 비교한다", () => {
    expect(bySortOrder(card({ id: 2, sortOrder: 1 }), card({ id: 1, sortOrder: 1 }))).toBeGreaterThan(0);
    expect(bySortOrder(card({ id: 1, sortOrder: 1 }), card({ id: 9, sortOrder: 2 }))).toBeLessThan(0);
  });
});
