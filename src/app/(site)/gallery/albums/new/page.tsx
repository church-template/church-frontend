import type { Metadata } from "next";
import { Container } from "@/components/shell/Container";
import { GalleryGate } from "@/components/gallery/GalleryGate";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { AlbumForm } from "@/components/gallery/AlbumForm";

export const metadata: Metadata = { title: "갤러리" };

export default function AlbumNewPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">앨범 등록</h1>
      <GalleryGate>
        <RequirePermission permission="GALLERY_WRITE" fallback={<EditAccessDenied />}>
          <AlbumForm mode="create" />
        </RequirePermission>
      </GalleryGate>
    </Container>
  );
}
