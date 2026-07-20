import { notFound } from "next/navigation";
import { Container } from "@/components/shell/Container";
import { MemberGate } from "@/components/common/MemberGate";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { SermonEditLoader } from "@/components/sermons/SermonEditLoader";

export default async function SermonEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 비숫자·0·음수 id는 렌더 전에 차단 — 상세 라우트와 동일 패턴
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">설교 수정</h1>
      <MemberGate permission="SERMON_VIEW" domainLabel="설교">
        <RequirePermission permission="SERMON_WRITE" fallback={<EditAccessDenied />}>
          <SermonEditLoader id={numId} />
        </RequirePermission>
      </MemberGate>
    </Container>
  );
}
