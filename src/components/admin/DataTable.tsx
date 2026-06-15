// src/components/admin/DataTable.tsx
// lean 컬럼 구동 테이블(단일 생산). 정렬·행선택·페이지네이션 미내장 — 페이지는 common/Pagination 조합.
// 06·07 소비 시 부족분은 해당 도메인에서 확장 제안(05는 lean만 보장).
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/common/Skeleton";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}
export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  actions?: (row: T) => ReactNode; // 후행 액션 셀(수정·삭제)
  empty?: ReactNode; // 기본 <EmptyState message="데이터가 없습니다." />
  loading?: boolean;
}

export function DataTable<T>({ columns, rows, rowKey, actions, empty, loading }: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex flex-col gap-xs" aria-busy>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return <>{empty ?? <EmptyState message="데이터가 없습니다." />}</>;
  }
  // 모바일 가로 스크롤: 어드민 표는 컬럼이 많아 좁은 화면에서 넘침 → overflow-x-auto로 감싼다(06·07 공통).
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-hairline text-left">
            {columns.map((c) => (
              <th key={c.key} className={cn(typo.bodySm, "py-sm pr-base text-muted", c.className)}>
                {c.header}
              </th>
            ))}
            {actions ? <th className="py-sm" aria-hidden /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-hairline">
              {columns.map((c) => (
                <td key={c.key} className={cn(typo.bodyMd, "py-base pr-base align-middle text-ink", c.className)}>
                  {c.cell(row)}
                </td>
              ))}
              {actions ? <td className="py-base text-right align-middle">{actions(row)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
