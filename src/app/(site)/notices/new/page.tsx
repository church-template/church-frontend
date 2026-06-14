import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { NoticeForm } from "@/components/notices/NoticeForm";

export default function NoticeNewPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">공지 등록</h1>
      <RequirePermission permission="NOTICE_WRITE" fallback={<EditAccessDenied />}>
        <NoticeForm mode="create" />
      </RequirePermission>
    </Container>
  );
}
