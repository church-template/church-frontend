import { BookOpen, GraduationCap, HeartHandshake, type LucideIcon } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Reveal } from "./Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { MINISTRY, MINISTRIES, type Ministry } from "@/constants/content";

// 아이콘은 컴포넌트에서 매핑 — 상수는 직렬화 가능한 키만 보유(스펙 §3). 색은 currentColor 상속.
const ICONS: Record<Ministry["key"], LucideIcon> = {
  worship: BookOpen,
  nextgen: GraduationCap,
  serving: HeartHandshake,
};

// 카드 배경 토큰 교차 — 연혁(HistoryBand)과 시작점을 달리해 인접 중복 회피(스펙 §3).
const CARD_TONES = [
  { card: "bg-primary-soft", head: "text-ink", body: "text-body" },
  { card: "bg-surface-soft", head: "text-ink", body: "text-body" },
  { card: "bg-surface-dark", head: "text-on-dark", body: "text-on-dark-soft" },
] as const;

export function MinistryCards() {
  return (
    <section className="py-section">
      <Container>
        <h2 className={cn(typo.displayLg, "text-ink")}>{MINISTRY.title}</h2>
        <div className="mt-lg grid gap-base sm:grid-cols-3">
          {MINISTRIES.map((m, i) => {
            const tone = CARD_TONES[i % CARD_TONES.length];
            const Icon = ICONS[m.key];
            return (
              <Reveal key={m.key} delay={i * 120} className="h-full">
                <div className={cn("h-full rounded-xl p-xl", tone.card, tone.head)}>
                  <Icon size={32} aria-hidden />
                  <h3 className={cn(typo.titleLg, "mt-base")}>{m.title}</h3>
                  <p className={cn(typo.bodyMd, "mt-xs", tone.body)}>{m.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
