import type { DepartmentNode } from "@/lib/api/types";

export interface FlatRow {
  node: DepartmentNode;
  depth: number;
}

// preorder DFS — 트리를 화면 표시 순서대로 평탄화하며 깊이를 부착한다.
export function flattenTree(nodes: DepartmentNode[], depth = 0): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const node of nodes) {
    rows.push({ node, depth });
    if (node.children.length > 0) {
      rows.push(...flattenTree(node.children, depth + 1));
    }
  }
  return rows;
}

// 대상 노드의 모든 하위(자기 제외) id 집합 — 상위 select 순환 방지용.
export function collectDescendantIds(node: DepartmentNode): Set<number> {
  const ids = new Set<number>();
  const walk = (n: DepartmentNode) => {
    for (const child of n.children) {
      ids.add(child.id);
      walk(child);
    }
  };
  walk(node);
  return ids;
}

// 트리에서 id로 노드(서브트리 포함)를 찾는다. 없으면 undefined.
export function findNode(nodes: DepartmentNode[], id: number): DepartmentNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return undefined;
}

export interface VisibleRow {
  node: DepartmentNode;
  depth: number;
  hasChildren: boolean;
}

// 접힌 노드의 하위는 건너뛰는 가시 평탄화(preorder). collapsed에 든 노드는 표시하되 자식은 숨긴다.
export function flattenVisible(
  nodes: DepartmentNode[],
  collapsed: Set<number>,
  depth = 0,
): VisibleRow[] {
  const rows: VisibleRow[] = [];
  for (const node of nodes) {
    const hasChildren = node.children.length > 0;
    rows.push({ node, depth, hasChildren });
    if (hasChildren && !collapsed.has(node.id)) {
      rows.push(...flattenVisible(node.children, collapsed, depth + 1));
    }
  }
  return rows;
}

// 자식 있는 모든 노드 id(전체 접기용).
export function collectCollapsibleIds(nodes: DepartmentNode[]): Set<number> {
  const ids = new Set<number>();
  const walk = (list: DepartmentNode[]) => {
    for (const node of list) {
      if (node.children.length > 0) {
        ids.add(node.id);
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return ids;
}
