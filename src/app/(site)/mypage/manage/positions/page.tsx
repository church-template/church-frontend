import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { PositionManager } from "@/components/admin/positions/PositionManager";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 운영 전용 화면(manage-hub → kind:"manage"). 부모 manage/layout이 로그인 가드, 여기서 POSITION_MANAGE 게이트.
export default function ManagePositionsPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>직분 관리</h1>
      <div className="mt-xl">
        <RequirePermission permission="POSITION_MANAGE" fallback={<EditAccessDenied />}>
          <PositionManager />
        </RequirePermission>
      </div>
    </Container>
  );
}
