import type { Metadata } from "next";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { CHURCH_PHOTOS } from "@/constants/content";
import { ChurchPhotos } from "@/components/about/ChurchPhotos";

export const metadata: Metadata = { title: CHURCH_PHOTOS.title };

// 교회 사진 — 상수 구동 정적 생성(백엔드 무관, about 도메인 격리). 토글·그리드·모달은 client 컴포넌트.
export default function ChurchPhotosPage() {
  return (
    <Container as="section" className="break-keep py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>{CHURCH_PHOTOS.title}</h1>
      <ChurchPhotos empty={CHURCH_PHOTOS.empty} groups={CHURCH_PHOTOS.groups} />
    </Container>
  );
}
