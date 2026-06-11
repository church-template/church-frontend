import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { WORSHIP, WORSHIP_SERVICES } from "@/constants/content";

export default function WorshipPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>{WORSHIP.title}</h1>
      <div className="mt-lg grid gap-base sm:grid-cols-2 lg:grid-cols-3">
        {WORSHIP_SERVICES.map((s) => (
          <div key={s.name} className="rounded-xl bg-surface-soft p-xl">
            <h2 className={cn(typo.titleMd, "text-ink")}>{s.name}</h2>
            <p className={cn(typo.datetime, "mt-xs text-body")}>{s.time}</p>
            <p className={cn(typo.bodySm, "text-muted")}>{s.place}</p>
          </div>
        ))}
      </div>
    </Container>
  );
}
