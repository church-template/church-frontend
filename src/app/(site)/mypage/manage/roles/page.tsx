import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { RoleManager } from "@/components/admin/roles/RoleManager";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 운영 전용 화면(manage-hub → kind:"manage"). 부모 manage/layout이 로그인 가드, 여기서 ROLE_MANAGE 게이트.
export default function ManageRolesPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>역할·권한 관리</h1>
      <div className="mt-xl">
        <RequirePermission permission="ROLE_MANAGE" fallback={<EditAccessDenied />}>
          <RoleManager />
        </RequirePermission>
      </div>
    </Container>
  );
}
