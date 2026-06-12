import { Container } from "@/components/shell/Container";
import { ScheduleCard } from "@/components/cards/ScheduleCard";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { WORSHIP, WORSHIP_SERVICES } from "@/constants/content";

// 13.4 ② 예배 시간 안내 — API 없음, 빌드 주입 상수(가이드 13.3/12장). 흰 캔버스 + soft 카드.
export function WorshipSection() {
  return (
    <section className="py-section">
      <Container>
        <h2 className={cn(typo.displayLg, "text-ink")}>{WORSHIP.title}</h2>
        <div className="mt-lg grid gap-base sm:grid-cols-2 lg:grid-cols-3">
          {WORSHIP_SERVICES.map((s) => (
            <ScheduleCard key={s.name} name={s.name} time={s.time} place={s.place} />
          ))}
        </div>
      </Container>
    </section>
  );
}
