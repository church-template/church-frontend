import { notFound } from "next/navigation";
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { EventForm } from "@/components/events/EventForm";
import { getEvent } from "@/lib/api/events";

export default async function EventEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 비숫자·0·음수 id는 fetch 전에 차단 — 형제 라우트([id]/page.tsx)와 동일 패턴
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const event = await getEvent(numId);
  if (!event) notFound();
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">일정 수정</h1>
      <RequirePermission permission="EVENT_WRITE" fallback={<EditAccessDenied />}>
        <EventForm mode="edit" initial={event} />
      </RequirePermission>
    </Container>
  );
}
