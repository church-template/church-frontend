import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { CHURCH_PHOTOS } from "@/constants/content";

export default function ChurchPhotosPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>{CHURCH_PHOTOS.title}</h1>
      {/* 정적 사진 자산이 준비되면 그리드로 교체 — 현재는 빈 상태 문구만 */}
      <p className={cn(typo.bodyMd, "mt-lg text-muted")}>{CHURCH_PHOTOS.empty}</p>
    </Container>
  );
}
