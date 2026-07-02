import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { Card } from "@/components/ui/Card";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import type { DeptProgram } from "@/constants/departments";

// 특별 프로그램 — 회색 밴드 위 흰 카드 2×2(이름 + 설명). 계절 이벤트라 날짜 배지 없음.
export function DeptPrograms({ heading, items }: { heading: string; items: DeptProgram[] }) {
  return (
    <section className="bg-surface-soft py-section">
      <Container>
        <Reveal>
          <h2 className={cn(typo.displayMd, "text-ink")}>{heading}</h2>
        </Reveal>
        <div className="mt-lg grid gap-base sm:grid-cols-2">
          {items.map((p, i) => (
            <Reveal key={p.name} delay={i * 120} className="h-full">
              <Card className="h-full p-xl">
                <h3 className={cn(typo.titleMd, "text-ink")}>{p.name}</h3>
                <p className={cn(typo.bodyMd, "mt-xs text-body")}>{p.desc}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
