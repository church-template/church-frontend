import { Container } from "@/components/shell/Container";
import { EventCard } from "@/components/cards/EventCard";
import { EmptyState } from "@/components/common/EmptyState";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { formatDate, formatEventTime } from "@/lib/date";
import { MAIN_SECTIONS } from "@/constants/content";
import type { EventCardResponse } from "@/lib/api/types";

// 13.4 ⑤ 다가오는 일정 5 — soft 밴드. 시간 엣지(endAt=null·allDay)는 formatEventTime 한 곳에서 처리.
// 정렬은 서버 보장(startAt asc) — 프론트 재정렬 금지.
export function EventSection({ events }: { events: EventCardResponse[] }) {
  return (
    <section className="bg-surface-soft py-section">
      <Container>
        <h2 className={cn(typo.displayLg, "text-ink")}>{MAIN_SECTIONS.events.title}</h2>
        {events.length === 0 ? (
          <EmptyState message={MAIN_SECTIONS.events.empty} className="mt-lg" />
        ) : (
          <div className="mt-lg grid gap-base sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard
                key={e.id}
                date={formatDate(e.startAt)}
                title={e.title}
                time={formatEventTime(e.startAt, e.endAt, e.allDay)}
                location={e.location}
                href={`/events/${e.id}`}
              />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
