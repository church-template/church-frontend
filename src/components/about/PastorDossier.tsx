import {
  BookOpen,
  Church,
  GraduationCap,
  HandHeart,
  HeartHandshake,
  Send,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { PASTOR, type PastorPhilosophyKey } from "@/constants/content";

// 철학 키→아이콘 매핑(상수는 직렬화 키만, 색은 currentColor=ink 상속 — MinistryCards 선례).
const PHILOSOPHY_ICONS: Record<PastorPhilosophyKey, LucideIcon> = {
  worship: Church,
  bible: BookOpen,
  fellowship: HeartHandshake,
  community: HandHeart,
  nextgen: GraduationCap,
  mission: Send,
};

// 밴드3 — 회색 밴드. 약력 헤어라인 행(세로) + 목회 철학 풀폭 3-up 아이콘 그리드.
export function PastorDossier() {
  return (
    <section className="bg-surface-soft py-section">
      <Container>
        <h2 className={cn(typo.titleLg, "text-ink")}>{PASTOR.credentials.heading}</h2>
        <ul className="mt-lg">
          {PASTOR.credentials.items.map((item, i) => (
            <li key={item} className="border-t border-hairline-soft first:border-t-0">
              <Reveal delay={i * 120}>
                <p className={cn(typo.bodyLg, "py-base text-body")}>{item}</p>
              </Reveal>
            </li>
          ))}
        </ul>

        <h2 className={cn(typo.titleLg, "mt-xl text-ink")}>{PASTOR.philosophy.heading}</h2>
        <ul className="mt-lg grid gap-base sm:grid-cols-2 lg:grid-cols-3">
          {PASTOR.philosophy.items.map((item, i) => {
            const Icon = PHILOSOPHY_ICONS[item.key];
            return (
              <li key={item.key} className="h-full">
                <Reveal delay={i * 120} className="h-full">
                  <div className="h-full rounded-xl bg-canvas p-xl">
                    <Icon size={32} aria-hidden className="text-ink" />
                    <p className={cn(typo.titleMd, "mt-base text-ink")}>{item.text}</p>
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
