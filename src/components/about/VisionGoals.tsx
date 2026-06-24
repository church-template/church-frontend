import { BookOpen, Church, HeartHandshake, Send, Sprout, Users } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { VISION } from "@/constants/content";

// VISION.points 순서(예배·성경·교제·지역사회·다음세대·선교)에 대응하는 아이콘(표현용 매핑).
const ICONS = [Church, BookOpen, Users, HeartHandshake, Sprout, Send] as const;

// 밴드4 — 회색. 비전 6항목을 lucide 아이콘 카드 그리드로(데스크톱 3-up·태블릿 2-up·모바일 1-up).
export function VisionGoals() {
  return (
    <section className="break-keep bg-surface-soft py-section">
      <Container>
        <Reveal>
          <h2 className={cn(typo.displayMd, "text-ink")}>{VISION.title}</h2>
        </Reveal>
        <ul className="mt-xxl grid gap-base sm:grid-cols-2 lg:grid-cols-3">
          {VISION.points.map((point, i) => {
            const Icon = ICONS[i] ?? Church;
            return (
              <li key={point}>
                <Reveal delay={i * 100}>
                  <div className="flex h-full flex-col gap-base rounded-xl border border-hairline bg-canvas p-xl">
                    <Icon size={32} className="text-primary" aria-hidden="true" />
                    <p className={cn(typo.titleMd, "text-ink")}>{point}</p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
