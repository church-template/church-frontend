import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/shell/Container";
import { MemberGate } from "@/components/common/MemberGate";
import { AlbumDetail } from "@/components/gallery/AlbumDetail";

export const metadata: Metadata = { title: "갤러리" };

export default async function AlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  return (
    <Container as="section" className="py-section">
      <MemberGate permission="GALLERY_VIEW" domainLabel="갤러리">
        <AlbumDetail id={numId} />
      </MemberGate>
    </Container>
  );
}
