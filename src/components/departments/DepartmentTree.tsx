import { DepartmentCard } from "./DepartmentCard";
import type { Department } from "@/constants/departments";

// 사역 인덱스 — 최상위 부서 카드 그리드. 하위부서는 각 상세의 SubDepartments에서만 노출(인덱스는 평면).
export function DepartmentTree({ departments }: { departments: Department[] }) {
  return (
    <div className="mt-lg grid gap-base sm:grid-cols-2 lg:grid-cols-3">
      {departments.map((d) => (
        <DepartmentCard key={d.slug} dept={d} />
      ))}
    </div>
  );
}
