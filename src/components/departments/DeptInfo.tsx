import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { Card } from "@/components/ui/Card";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import type { DeptInfoItem } from "@/constants/departments";

// 알림 사항 — 회색 밴드 위 흰 카드(schedule-card 성격). label(muted) + value(ink).
export function DeptInfo({ heading, items }: { heading: string; items: DeptInfoItem[] }) {
  return (
    <section className="bg-surface-soft py-section">
      <Container>
        <Reveal>
          <h2 className={cn(typo.displayMd, "text-ink")}>{heading}</h2>
        </Reveal>
        <div className="mt-lg grid gap-base sm:grid-cols-2">
          {items.map((it, i) => (
            <Reveal key={it.label} delay={i * 120} className="h-full">
              <Card className="h-full p-xl">
                <dl>
                  <dt className={cn(typo.bodyMd, "text-muted")}>{it.label}</dt>
                  <dd className={cn(typo.titleMd, "mt-xs text-ink")}>{it.value}</dd>
                </dl>
              </Card>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
