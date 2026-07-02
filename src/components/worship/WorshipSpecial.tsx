import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { EventCard } from "@/components/cards/EventCard";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { WORSHIP, SPECIAL_SERVICES } from "@/constants/content";

// 회색 밴드 — 특별 예배 6종을 EventCard(날짜 배지) 3-up으로. href 없이 비인터랙티브.
export function WorshipSpecial() {
  return (
    <section className="break-keep bg-surface-soft py-section">
      <Container>
        <Reveal>
          <h2 className={cn(typo.titleLg, "text-ink")}>{WORSHIP.specialHeading}</h2>
          <p className={cn(typo.bodyLg, "mt-base text-body")}>{WORSHIP.specialLead}</p>
        </Reveal>
        <ul className="mt-xxl grid gap-base sm:grid-cols-2 lg:grid-cols-3">
          {SPECIAL_SERVICES.map((s, i) => (
            <li key={s.name}>
              <Reveal delay={i * 120} className="h-full">
                <EventCard date={s.date} title={s.name} time={s.time} summary={s.desc} />
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
