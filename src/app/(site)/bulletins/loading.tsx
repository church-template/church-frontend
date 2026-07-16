import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { ListRowsSkeleton } from "@/components/common/ListRowsSkeleton";

// 주보 목록 로딩 — 실물 페이지와 동일 골격(제목 즉시 표시 + 행 목록).
export default function Loading() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>주보</h1>
      <p role="status" className="sr-only">
        페이지를 불러오는 중입니다
      </p>
      <div className="mt-xl">
        <ListRowsSkeleton />
      </div>
    </Container>
  );
}
