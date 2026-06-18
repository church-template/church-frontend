import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { TagManager } from "@/components/admin/tags/TagManager";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 운영 전용 화면(manage-hub → kind:"manage"). 부모 manage/layout이 로그인 가드, 여기서 TAG_MANAGE 게이트.
export default function ManageTagsPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>태그 관리</h1>
      <div className="mt-xl">
        <RequirePermission permission="TAG_MANAGE" fallback={<EditAccessDenied />}>
          <TagManager />
        </RequirePermission>
      </div>
    </Container>
  );
}
