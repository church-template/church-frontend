"use client";

import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { DepartmentManager } from "@/components/admin/departments/DepartmentManager";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

// 운영 전용 부서 계층 관리. 제목·컨테이너는 항상 렌더하고 DEPT_WRITE 게이트로 본문만 가린다(media 패턴).
// useSearchParams 미사용이라 Suspense 경계 불필요.
export default function ManageDepartmentsPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>부서 관리</h1>
      <RequirePermission permission="DEPT_WRITE" fallback={<EditAccessDenied />}>
        <DepartmentManager />
      </RequirePermission>
    </Container>
  );
}
