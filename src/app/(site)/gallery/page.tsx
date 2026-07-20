import { Suspense } from "react";
import type { Metadata } from "next";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { MemberGate } from "@/components/common/MemberGate";
import { AlbumList } from "@/components/gallery/AlbumList";
import { AlbumListAction } from "@/components/gallery/GalleryAdminActions";

export const metadata: Metadata = { title: "갤러리" };

// 회원전용 갤러리(가이드 2.3). 게이트가 권한을 선판단하고, AlbumList가 useSearchParams로
// page·tagId를 읽어 TanStack Query로 조회한다. useSearchParams 때문에 Suspense 경계 필요.
export default function GalleryPage() {
  return (
    <Container as="section" className="py-section">
      {/* 등록 버튼은 공지·일정처럼 제목 행에 — 필터 행에 두면 알약이 폭을 나눠 써 일찍 줄바꿈된다. */}
      <div className="flex items-center justify-between gap-base">
        <h1 className={cn(typo.displayMd, "text-ink")}>갤러리</h1>
        <AlbumListAction />
      </div>
      <Suspense fallback={null}>
        <MemberGate permission="GALLERY_VIEW" domainLabel="갤러리">
          <AlbumList />
        </MemberGate>
      </Suspense>
    </Container>
  );
}
