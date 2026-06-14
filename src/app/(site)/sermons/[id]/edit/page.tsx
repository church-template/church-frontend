import { notFound } from "next/navigation";
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { SermonForm } from "@/components/sermons/SermonForm";
import { getSermon } from "@/lib/api/sermons";

export default async function SermonEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 비숫자·0·음수 id는 fetch 전에 차단 — 형제 라우트([id]/page.tsx)와 동일 패턴
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const sermon = await getSermon(numId);
  if (!sermon) notFound();
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">설교 수정</h1>
      <RequirePermission permission="SERMON_WRITE" fallback={<EditAccessDenied />}>
        <SermonForm mode="edit" initial={sermon} />
      </RequirePermission>
    </Container>
  );
}
