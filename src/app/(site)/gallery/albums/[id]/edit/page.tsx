import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/shell/Container";
import { GalleryGate } from "@/components/gallery/GalleryGate";
import { RequirePermission } from "@/components/admin/RequirePermission";
import { EditAccessDenied } from "@/components/admin/EditGate";
import { AlbumEditLoader } from "@/components/gallery/AlbumEditLoader";

export const metadata: Metadata = { title: "갤러리" };

export default async function AlbumEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 비숫자·0·음수 id는 렌더 전에 차단 — 앨범 상세 라우트와 동일 패턴
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  return (
    <Container as="section" className="py-section">
      <h1 className="sr-only">앨범 수정</h1>
      <GalleryGate>
        <RequirePermission permission="GALLERY_WRITE" fallback={<EditAccessDenied />}>
          <AlbumEditLoader id={numId} />
        </RequirePermission>
      </GalleryGate>
    </Container>
  );
}
