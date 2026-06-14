import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { SermonForm } from "@/components/sermons/SermonForm";

export default function SermonNewPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">설교 등록</h1>
      <RequirePermission permission="SERMON_WRITE" fallback={<EditAccessDenied />}>
        <SermonForm mode="create" />
      </RequirePermission>
    </Container>
  );
}
