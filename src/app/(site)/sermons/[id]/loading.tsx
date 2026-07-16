import { Container } from "@/components/shell/Container";
import { DetailSkeleton } from "@/components/common/DetailSkeleton";

// 상세 로딩 — 공통 상세 골격(뒤로가기 + 제목 + 메타 + 본문 자리).
export default function Loading() {
  return (
    <Container as="section" className="py-section">
      <p role="status" className="sr-only">
        페이지를 불러오는 중입니다
      </p>
      <DetailSkeleton />
    </Container>
  );
}
