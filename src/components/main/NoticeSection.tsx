import { Container } from "@/components/shell/Container";
import { NoticeRow } from "@/components/cards/NoticeRow";
import { EmptyState } from "@/components/common/EmptyState";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { MAIN_SECTIONS } from "@/constants/content";
import type { NoticeCardResponse } from "@/lib/api/types";

// 13.4 ④ 공지 3 — 흰 캔버스, hairline 행 목록. 고정글 우선 정렬은 서버 보장(재정렬 금지).
export function NoticeSection({ notices }: { notices: NoticeCardResponse[] }) {
  return (
    <section className="py-section">
      <Container>
        <h2 className={cn(typo.displayLg, "text-ink")}>{MAIN_SECTIONS.notices.title}</h2>
        {notices.length === 0 ? (
          <EmptyState message={MAIN_SECTIONS.notices.empty} className="mt-lg" />
        ) : (
          <div className="mt-lg">
            {notices.map((n) => (
              <NoticeRow
                key={n.id}
                title={n.title}
                date={formatDate(n.createdAt)}
                isPinned={n.isPinned}
                href={`/notices/${n.id}`}
              />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
