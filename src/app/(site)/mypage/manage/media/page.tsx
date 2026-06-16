// src/app/(site)/mypage/manage/media/page.tsx
import { Suspense } from "react";
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { MediaLibrary } from "@/components/admin/media/MediaLibrary";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 운영 전용 화면(manage-hub → kind:"manage"). 부모 manage/layout이 로그인 가드, 여기서 MEDIA_MANAGE 게이트.
export default function ManageMediaPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>미디어 라이브러리</h1>
      <div className="mt-xl">
        <RequirePermission permission="MEDIA_MANAGE" fallback={<EditAccessDenied />}>
          {/* MediaLibrary는 useSearchParams 사용 → 정적 프리렌더 빌드 위해 Suspense 경계 필수(gallery/page 선례) */}
          <Suspense fallback={null}>
            <MediaLibrary />
          </Suspense>
        </RequirePermission>
      </div>
    </Container>
  );
}
