import { SiteShell } from "@/components/shell/SiteShell";
import { Container } from "@/components/shell/Container";
import { EmptyState } from "@/components/common/EmptyState";
import { DepartmentTree } from "@/components/departments/DepartmentTree";
import { DEPARTMENTS, DEPT_PAGE } from "@/constants/departments";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 사역(부서) 목록 — 프론트 상수 구동(메인처럼 자립). 백엔드 불필요 → 정적 생성.
export default function DepartmentsPage() {
  return (
    <SiteShell>
      <Container as="section" className="py-section">
        <p className={cn(typo.caption, "text-center text-primary")}>{DEPT_PAGE.eyebrow}</p>
        <h1 className={cn(typo.displayMd, "mt-xs text-center text-ink")}>{DEPT_PAGE.title}</h1>
        {DEPARTMENTS.length === 0 ? (
          <EmptyState message={DEPT_PAGE.empty} className="mt-lg" />
        ) : (
          <DepartmentTree departments={DEPARTMENTS} />
        )}
      </Container>
    </SiteShell>
  );
}
