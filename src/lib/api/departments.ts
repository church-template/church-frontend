import { apiUrl } from "@/lib/auth/apiBase";
import type {
  DepartmentCardResponse,
  DepartmentDetailResponse,
  DepartmentNode,
} from "./types";

// 부서 조회(공개, 인증 불필요) — 서버 컴포넌트 전용. revalidate 60 = main.ts와 동일 캐시 정책.
export async function getDepartments(): Promise<DepartmentCardResponse[]> {
  const res = await fetch(apiUrl("/api/departments"), { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`GET /api/departments 실패: ${res.status}`);
  }
  // 비페이징 평배열(정렬 sortOrder,id는 서버 보장). null 방어.
  return ((await res.json()) as DepartmentCardResponse[] | null) ?? [];
}

export async function getDepartment(id: number): Promise<DepartmentDetailResponse | null> {
  const res = await fetch(apiUrl(`/api/departments/${id}`), { next: { revalidate: 60 } });
  if (res.status === 404) {
    return null; // 미존재 → 페이지가 notFound()로 처리
  }
  if (!res.ok) {
    throw new Error(`GET /api/departments/${id} 실패: ${res.status}`);
  }
  return (await res.json()) as DepartmentDetailResponse;
}

// 정렬 비교자 — 트리 조립·상세 자식 정렬 공용(서버 정렬 방어 + 트리 재정렬).
export const bySortOrder = (
  a: DepartmentCardResponse,
  b: DepartmentCardResponse,
): number => a.sortOrder - b.sortOrder || a.id - b.id;

// 평배열 → parentId 트리. 입력 불변(새 노드 생성). 부모 미존재(고아)는 루트로 승격.
export function buildDepartmentTree(
  list: DepartmentCardResponse[],
): DepartmentNode[] {
  const byId = new Map<number, DepartmentNode>();
  for (const d of list) {
    byId.set(d.id, { ...d, children: [] });
  }
  const roots: DepartmentNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId != null ? byId.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  for (const node of byId.values()) {
    node.children.sort(bySortOrder);
  }
  roots.sort(bySortOrder);
  return roots;
}
