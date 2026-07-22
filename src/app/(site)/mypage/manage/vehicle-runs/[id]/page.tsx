import { Suspense } from "react";
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { VehicleRosterView } from "@/components/admin/vehicles/VehicleRosterView";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 운영 전용 — 부모 manage/layout이 로그인 가드, 여기서 VEHICLE_MANAGE 게이트.
// params/searchParams는 Promise(Next 16 — challenges/[id] 선례).
export default async function VehicleRosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ departsAt?: string }>;
}) {
  const { id } = await params;
  const { departsAt } = await searchParams;
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>탑승 명단</h1>
      <div className="mt-xl">
        <RequirePermission permission="VEHICLE_MANAGE" fallback={<EditAccessDenied />}>
          {/* VehicleRosterView는 useSearchParams 사용 → Suspense 경계(inquiries 선례) */}
          <Suspense fallback={null}>
            <VehicleRosterView runId={Number(id)} departsAt={departsAt} />
          </Suspense>
        </RequirePermission>
      </div>
    </Container>
  );
}
