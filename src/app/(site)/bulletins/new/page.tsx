import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { BulletinForm } from "@/components/bulletins/BulletinForm";

export default function BulletinNewPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">주보 등록</h1>
      <RequirePermission permission="BULLETIN_WRITE" fallback={<EditAccessDenied />}>
        <BulletinForm mode="create" />
      </RequirePermission>
    </Container>
  );
}
