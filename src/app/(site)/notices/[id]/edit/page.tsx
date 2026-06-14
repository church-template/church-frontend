import { notFound } from "next/navigation";
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { NoticeForm } from "@/components/notices/NoticeForm";
import { getNotice } from "@/lib/api/notices";

export default async function NoticeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 비숫자·0·음수 id는 fetch 전에 차단 — 형제 라우트([id]/page.tsx)와 동일 패턴
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const notice = await getNotice(numId);
  if (!notice) notFound();
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">공지 수정</h1>
      <RequirePermission permission="NOTICE_WRITE" fallback={<EditAccessDenied />}>
        <NoticeForm mode="edit" initial={notice} />
      </RequirePermission>
    </Container>
  );
}
