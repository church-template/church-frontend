import { BookOpen, Sparkles, Users, type LucideIcon } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import type { DeptFeature } from "@/constants/departments";

// 아이콘은 직렬화 키를 컴포넌트에서 매핑(MinistryCards와 동일 방식). 색은 currentColor 상속.
const ICONS: Record<string, LucideIcon> = {
  book: BookOpen,
  users: Users,
  sparkles: Sparkles,
};

// 카드 배경 토큰 교차 — MinistryCards와 동일(단일 액센트 원칙).
const TONES = [
  { card: "bg-primary-soft", head: "text-ink", body: "text-body" },
  { card: "bg-surface-soft", head: "text-ink", body: "text-body" },
  { card: "bg-surface-dark", head: "text-on-dark", body: "text-on-dark-soft" },
] as const;

// 부서 인트로 헤딩·리드 + 3-up 기능 카드(WorshipRegular의 제목+리드+카드 패턴).
export function DeptFeatures({
  heading,
  lead,
  items,
}: {
  heading: string;
  lead?: string;
  items: DeptFeature[];
}) {
  return (
    <Container as="section" className="break-keep py-section">
      <Reveal>
        <h2 className={cn(typo.displayMd, "text-ink")}>{heading}</h2>
        {lead ? <p className={cn(typo.bodyLg, "mt-base text-body")}>{lead}</p> : null}
      </Reveal>
      <div className="mt-lg grid gap-base sm:grid-cols-3">
        {items.map((f, i) => {
          const tone = TONES[i % TONES.length];
          const Icon = ICONS[f.icon] ?? BookOpen;
          return (
            <Reveal key={f.title} delay={i * 120} className="h-full">
              <div className={cn("h-full rounded-xl p-xl", tone.card, tone.head)}>
                <Icon size={32} aria-hidden />
                <h3 className={cn(typo.titleLg, "mt-base")}>{f.title}</h3>
                <p className={cn(typo.bodyMd, "mt-xs", tone.body)}>{f.desc}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Container>
  );
}
