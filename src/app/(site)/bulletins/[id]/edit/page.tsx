import { notFound } from "next/navigation";
import { Container } from "@/components/shell/Container";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { BulletinForm } from "@/components/bulletins/BulletinForm";
import { getBulletin } from "@/lib/api/bulletins";

export default async function BulletinEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 비숫자·0·음수 id는 fetch 전에 차단 — 공지 edit 라우트와 동일 패턴
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  // getBulletin은 미존재 시 throw — 페이지에선 404로 수렴시킨다(공개 셸에서 스택 노출 방지).
  const bulletin = await getBulletin(numId).catch(() => null);
  if (!bulletin) notFound();
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">주보 수정</h1>
      <RequirePermission permission="BULLETIN_WRITE" fallback={<EditAccessDenied />}>
        <BulletinForm mode="edit" initial={bulletin} />
      </RequirePermission>
    </Container>
  );
}
