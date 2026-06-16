"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { adminKeys } from "@/lib/admin/queryKeys";
import { buildDepartmentTree } from "@/lib/api/departments";
import { listDepartmentsAdmin, deleteDepartment } from "@/lib/api/departments.admin";
import { collectCollapsibleIds } from "./treeUtils";
import { DepartmentTree } from "./DepartmentTree";
import { DepartmentFormDialog } from "./DepartmentFormDialog";
import type { DepartmentNode } from "@/lib/api/types";

export function DepartmentManager() {
  const qc = useQueryClient();
  const { data: departments = [], isLoading } = useQuery({
    queryKey: adminKeys.list("departments"),
    queryFn: listDepartmentsAdmin,
  });
  const roots = buildDepartmentTree(departments);

  const [collapsed, setCollapsed] = useState<Set<number>>(new Set()); // 기본 전체 펼침
  const [createParentId, setCreateParentId] = useState<number | null | undefined>(undefined); // undefined=닫힘
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentNode | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => deleteDepartment(id),
    onError: adminOnError(), // 409 DEPARTMENT_HAS_CHILDREN 등은 handleApiError가 토스트 처리
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.list("departments") });
      notify.success("삭제했습니다.");
      setDeleteTarget(null);
    },
  });

  // 개별 노드 접힘 토글(불변 갱신).
  const toggle = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <div className="mt-base flex items-start gap-xs rounded-xl bg-surface-soft p-base">
        <Info size={20} aria-hidden className="mt-xxs shrink-0 text-muted" />
        <p className={cn(typo.bodySm, "text-body")}>
          {"이 화면은 운영용 부서 데이터를 관리합니다. 공개 '교육·부서 소개' 페이지는 별도 콘텐츠로 구성되어 있어, 여기서의 변경이 자동 반영되지 않습니다."}
        </p>
      </div>

      {/* 공지·미디어와 동일하게 페이지 Container 폭을 그대로 사용(가운데 정렬·좌우 패딩은 Container가 제공). */}
      <div className="mt-lg">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div className="flex gap-xs">
            <Button type="button" variant="tertiary" onClick={() => setCollapsed(new Set())}>전체 펼치기</Button>
            <Button type="button" variant="tertiary" onClick={() => setCollapsed(collectCollapsibleIds(roots))}>전체 접기</Button>
          </div>
          <Button type="button" variant="primary" onClick={() => setCreateParentId(null)}>새 부서</Button>
        </div>

        <div className="mt-base">
          {isLoading ? (
            <p className={cn(typo.bodyMd, "text-muted")}>불러오는 중…</p>
          ) : (
            <DepartmentTree
              roots={roots}
              collapsed={collapsed}
              onToggle={toggle}
              onCreateChild={(parentId) => setCreateParentId(parentId)}
              onEdit={(id) => setEditId(id)}
              onDelete={(node) => setDeleteTarget(node)}
            />
          )}
        </div>
      </div>

      <DepartmentFormDialog
        open={createParentId !== undefined}
        onOpenChange={(v) => { if (!v) setCreateParentId(undefined); }}
        mode="create"
        defaultParentId={createParentId ?? null}
        departments={departments}
      />
      <DepartmentFormDialog
        open={editId != null}
        onOpenChange={(v) => { if (!v) setEditId(null); }}
        mode="edit"
        editId={editId ?? undefined}
        departments={departments}
      />
      <DeleteConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title={deleteTarget ? `'${deleteTarget.name}' 부서를 삭제할까요?` : "부서를 삭제할까요?"}
        warning="하위 부서가 있으면 삭제할 수 없습니다. 삭제 후 되돌릴 수 없습니다."
        pending={remove.isPending}
        onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id); }}
      />
    </>
  );
}
