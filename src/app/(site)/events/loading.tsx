import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/common/Skeleton";

// 일정 로딩 — 실물 페이지와 동일 골격(제목 즉시 표시 + 필터 자리 + 캘린더 블록 근사).
export default function Loading() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>일정</h1>
      <p role="status" className="sr-only">
        페이지를 불러오는 중입니다
      </p>
      <div aria-hidden className="mt-lg">
        <Skeleton className="h-8 w-2/3" />
      </div>
      <div aria-hidden className="mt-lg">
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </Container>
  );
}
