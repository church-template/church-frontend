import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/common/Skeleton";
import { ListRowsSkeleton } from "@/components/common/ListRowsSkeleton";

// 공지 목록 로딩 — 실물 페이지와 동일 골격(제목 즉시 표시 + 검색/필터 자리 + 행 목록).
export default function Loading() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>공지</h1>
      <p role="status" className="sr-only">
        페이지를 불러오는 중입니다
      </p>
      <div aria-hidden className="mt-lg flex flex-col gap-base">
        <Skeleton className="h-12 w-full rounded-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
      <div className="mt-xl">
        <ListRowsSkeleton />
      </div>
    </Container>
  );
}
