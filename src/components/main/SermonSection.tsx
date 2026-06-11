import { Container } from "@/components/shell/Container";
import { SermonCard } from "@/components/cards/SermonCard";
import { EmptyState } from "@/components/common/EmptyState";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { MAIN_SECTIONS } from "@/constants/content";
import type { SermonCardResponse } from "@/lib/api/types";

// 13.4 ③ 최신 설교 3 — soft 밴드 교차 리듬. 텍스트형 카드(D1), viewCount·author 생략(13.2).
// 정렬은 서버 보장(preachedAt desc) — 프론트 재정렬 금지.
export function SermonSection({ sermons }: { sermons: SermonCardResponse[] }) {
  return (
    <section className="bg-surface-soft py-section">
      <Container>
        <h2 className={cn(typo.displayLg, "text-ink")}>{MAIN_SECTIONS.sermons.title}</h2>
        {sermons.length === 0 ? (
          <EmptyState message={MAIN_SECTIONS.sermons.empty} className="mt-lg" />
        ) : (
          <div className="mt-lg grid gap-base sm:grid-cols-2 lg:grid-cols-3">
            {sermons.map((s) => (
              <SermonCard
                key={s.id}
                title={s.title}
                preacher={s.preacher}
                date={formatDate(s.preachedAt)}
                series={s.series}
                scripture={s.scripture}
                tags={s.tags.map((t) => t.name)}
                href={`/sermons/${s.id}`}
              />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
