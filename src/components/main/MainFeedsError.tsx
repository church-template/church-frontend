import { Container } from "@/components/shell/Container";
import { EmptyState } from "@/components/common/EmptyState";
import { MAIN_SECTIONS } from "@/constants/content";

// 소식(설교·공지·일정) 로드 실패 시 그 자리에만 뜨는 폴백 밴드. 문구는 상수 주입, 페이지 나머지는 정상.
export function MainFeedsError() {
  return (
    <section className="bg-surface-soft py-section">
      <Container>
        <EmptyState message={MAIN_SECTIONS.error} />
      </Container>
    </section>
  );
}
