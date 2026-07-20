import type { Metadata } from "next";
import { Container } from "@/components/shell/Container";
import { MemberGate } from "@/components/common/MemberGate";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { AlbumForm } from "@/components/gallery/AlbumForm";

export const metadata: Metadata = { title: "갤러리" };

export default function AlbumNewPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">앨범 등록</h1>
      <MemberGate permission="GALLERY_VIEW" domainLabel="갤러리">
        <RequirePermission permission="GALLERY_WRITE" fallback={<EditAccessDenied />}>
          <AlbumForm mode="create" />
        </RequirePermission>
      </MemberGate>
    </Container>
  );
}
