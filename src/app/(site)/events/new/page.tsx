import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { EventForm } from "@/components/events/EventForm";

export default function EventNewPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">일정 등록</h1>
      <RequirePermission permission="EVENT_WRITE" fallback={<EditAccessDenied />}>
        <EventForm mode="create" />
      </RequirePermission>
    </Container>
  );
}
