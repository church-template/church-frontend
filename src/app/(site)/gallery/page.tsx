import { Suspense } from "react";
import type { Metadata } from "next";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { GalleryGate } from "@/components/gallery/GalleryGate";
import { AlbumList } from "@/components/gallery/AlbumList";

export const metadata: Metadata = { title: "갤러리" };

// 회원전용 갤러리(가이드 2.3). 게이트가 권한을 선판단하고, AlbumList가 useSearchParams로
// page·tagId를 읽어 TanStack Query로 조회한다. useSearchParams 때문에 Suspense 경계 필요.
export default function GalleryPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>갤러리</h1>
      <Suspense fallback={null}>
        <GalleryGate>
          <AlbumList />
        </GalleryGate>
      </Suspense>
    </Container>
  );
}
