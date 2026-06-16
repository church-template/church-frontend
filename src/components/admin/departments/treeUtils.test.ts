import { describe, it, expect } from "vitest";
import { buildDepartmentTree } from "@/lib/api/departments";
import { flattenTree, collectDescendantIds, findNode, flattenVisible, collectCollapsibleIds } from "./treeUtils";
import type { DepartmentCardResponse } from "@/lib/api/types";

const list: DepartmentCardResponse[] = [
  { id: 1, name: "학생부", leader: "", parentId: null, sortOrder: 10 },
  { id: 2, name: "중등부", leader: "", parentId: 1, sortOrder: 10 },
  { id: 3, name: "고등부", leader: "", parentId: 1, sortOrder: 20 },
  { id: 4, name: "청년부", leader: "", parentId: null, sortOrder: 20 },
];

describe("treeUtils", () => {
  it("flattenTree는 preorder 순서로 depth를 부착한다", () => {
    const rows = flattenTree(buildDepartmentTree(list));
    expect(rows.map((r) => [r.node.name, r.depth])).toEqual([
      ["학생부", 0],
      ["중등부", 1],
      ["고등부", 1],
      ["청년부", 0],
    ]);
  });

  it("collectDescendantIds는 자기 제외 하위 id를 모은다", () => {
    const node = findNode(buildDepartmentTree(list), 1)!;
    expect([...collectDescendantIds(node)].sort((a, b) => a - b)).toEqual([2, 3]);
  });

  it("findNode는 서브트리에서 노드를 찾고 없으면 undefined", () => {
    const tree = buildDepartmentTree(list);
    expect(findNode(tree, 3)?.name).toBe("고등부");
    expect(findNode(tree, 99)).toBeUndefined();
  });
});

// 깊이 2 포함 픽스처(가시 평탄화용)
const deepList: DepartmentCardResponse[] = [
  { id: 1, name: "학생부", leader: "", parentId: null, sortOrder: 10 },
  { id: 2, name: "중등부", leader: "", parentId: 1, sortOrder: 10 },
  { id: 3, name: "고등부", leader: "", parentId: 1, sortOrder: 20 },
  { id: 5, name: "1학년부", leader: "", parentId: 2, sortOrder: 10 },
  { id: 4, name: "청년부", leader: "", parentId: null, sortOrder: 20 },
];

describe("flattenVisible / collectCollapsibleIds", () => {
  it("접힘 없으면 전체 평탄화 + depth·hasChildren", () => {
    const rows = flattenVisible(buildDepartmentTree(deepList), new Set());
    expect(rows.map((r) => [r.node.name, r.depth, r.hasChildren])).toEqual([
      ["학생부", 0, true],
      ["중등부", 1, true],
      ["1학년부", 2, false],
      ["고등부", 1, false],
      ["청년부", 0, false],
    ]);
  });

  it("접힌 노드의 하위는 제외한다", () => {
    const rows = flattenVisible(buildDepartmentTree(deepList), new Set([2]));
    expect(rows.map((r) => r.node.name)).toEqual(["학생부", "중등부", "고등부", "청년부"]);
  });

  it("collectCollapsibleIds는 자식 있는 노드 id만 모은다", () => {
    const ids = collectCollapsibleIds(buildDepartmentTree(deepList));
    expect([...ids].sort((a, b) => a - b)).toEqual([1, 2]);
  });
});
