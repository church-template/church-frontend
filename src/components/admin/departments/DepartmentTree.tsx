"use client";

import { ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { flattenVisible } from "./treeUtils";
import type { DepartmentNode } from "@/lib/api/types";

// depth별 좌패딩(spacing 토큰). 3단↑은 마지막으로 캡.
const INDENT = ["pl-0", "pl-lg", "pl-xxl"];
const indentClass = (depth: number) => INDENT[Math.min(depth, INDENT.length - 1)];
const leaderOf = (node: DepartmentNode) => (node.leader?.trim() ? node.leader : "—");

export interface DepartmentTreeProps {
  roots: DepartmentNode[];
  collapsed: Set<number>;
  onToggle: (id: number) => void;
  onCreateChild: (parentId: number) => void;
  onEdit: (id: number) => void;
  onDelete: (node: DepartmentNode) => void;
}

// 노드 액션 — 아이콘 + lg 이상 텍스트(고령 사용자 배려), 모바일 아이콘-only.
function NodeActions({
  node,
  onCreateChild,
  onEdit,
  onDelete,
}: {
  node: DepartmentNode;
  onCreateChild: (parentId: number) => void;
  onEdit: (id: number) => void;
  onDelete: (node: DepartmentNode) => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-xxs whitespace-nowrap">
      <Button type="button" variant="tertiary" onClick={() => onCreateChild(node.id)} aria-label={`${node.name} 하위 추가`}>
        <Plus size={18} aria-hidden />
        <span className="hidden lg:inline">하위</span>
      </Button>
      <Button type="button" variant="tertiary" onClick={() => onEdit(node.id)} aria-label={`${node.name} 수정`}>
        <Pencil size={18} aria-hidden />
        <span className="hidden lg:inline">수정</span>
      </Button>
      <Button type="button" variant="tertiary" onClick={() => onDelete(node)} aria-label={`${node.name} 삭제`}>
        <Trash2 size={18} aria-hidden />
        <span className="hidden lg:inline">삭제</span>
      </Button>
    </span>
  );
}

// 접이식 단일 트리(표현) — 가시 행만 렌더. 자식 있는 노드만 chevron, 잎 노드는 동일 폭 스페이서로 정렬.
export function DepartmentTree({ roots, collapsed, onToggle, onCreateChild, onEdit, onDelete }: DepartmentTreeProps) {
  if (roots.length === 0) {
    return <p className={cn(typo.bodyMd, "text-muted")}>등록된 부서가 없습니다.</p>;
  }
  const rows = flattenVisible(roots, collapsed);
  return (
    <ul className="flex flex-col">
      {rows.map(({ node, depth, hasChildren }) => {
        const isCollapsed = collapsed.has(node.id);
        return (
          <li key={node.id} className="flex items-center gap-sm border-b border-hairline py-sm">
            <span className={cn("flex min-w-0 flex-1 items-center", indentClass(depth))}>
              <span className="mr-xxs flex w-6 shrink-0 items-center justify-center">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => onToggle(node.id)}
                    aria-label={isCollapsed ? `${node.name} 펼치기` : `${node.name} 접기`}
                    aria-expanded={!isCollapsed}
                    className="text-muted hover:text-ink"
                  >
                    {isCollapsed ? <ChevronRight size={18} aria-hidden /> : <ChevronDown size={18} aria-hidden />}
                  </button>
                ) : null}
              </span>
              <span className={cn(typo.bodyMd, "truncate text-ink")}>{node.name}</span>
              <span className={cn(typo.bodySm, "ml-xs shrink-0 text-muted")}>· {leaderOf(node)}</span>
            </span>
            <NodeActions node={node} onCreateChild={onCreateChild} onEdit={onEdit} onDelete={onDelete} />
          </li>
        );
      })}
    </ul>
  );
}
