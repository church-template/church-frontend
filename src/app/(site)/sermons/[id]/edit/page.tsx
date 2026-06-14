import { notFound } from "next/navigation";
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { SermonForm } from "@/components/sermons/SermonForm";
import { getSermon } from "@/lib/api/sermons";

export default async function SermonEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sermon = await getSermon(Number(id));
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
