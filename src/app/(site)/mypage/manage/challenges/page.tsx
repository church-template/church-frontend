import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { ChallengeManager } from "@/components/admin/challenges/ChallengeManager";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 운영 전용 화면(manage-hub → kind:"manage"). 부모 manage/layout이 로그인 가드, 여기서 CHALLENGE_MANAGE 게이트.
export default function ManageChallengesPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>통독 챌린지 관리</h1>
      <div className="mt-xl">
        <RequirePermission permission="CHALLENGE_MANAGE" fallback={<EditAccessDenied />}>
          <ChallengeManager />
        </RequirePermission>
      </div>
    </Container>
  );
}
