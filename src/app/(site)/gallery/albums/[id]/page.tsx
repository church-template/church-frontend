import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/shell/Container";
import { GalleryGate } from "@/components/gallery/GalleryGate";
import { AlbumDetail } from "@/components/gallery/AlbumDetail";

export const metadata: Metadata = { title: "갤러리" };

export default async function AlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  return (
    <Container as="section" className="py-section">
      <GalleryGate>
        <AlbumDetail id={numId} />
      </GalleryGate>
    </Container>
  );
}
