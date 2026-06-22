import Link from "next/link";
import { Container } from "@/components/shell/Container";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "./Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { HISTORY } from "@/constants/content";

// 카드 배경 토큰 교차(스펙 H2) — 참조의 브랜드 3색을 시스템 토큰으로 재해석(단일 액센트 원칙).
const BAND_TONES = [
  { card: "bg-surface-dark", head: "text-on-dark", body: "text-on-dark-soft" },
  { card: "bg-primary-soft", head: "text-ink", body: "text-body" },
  { card: "bg-surface-soft", head: "text-ink", body: "text-body" },
] as const;

// 연혁 카드 시퀀스(스펙 §3) — 연출 섹션이라 헤딩 없이 aria-label, 카드가 곧 콘텐츠.
export function HistoryBand() {
  return (
    <section aria-label={HISTORY.title} className="py-section">
      <Container className="flex flex-col gap-base">
        {HISTORY.items.map((item, i) => {
          const tone = BAND_TONES[i % BAND_TONES.length];
          return (
            <Reveal key={item.id} delay={i * 120}>
              <div className={cn("rounded-xl p-xxl", tone.card)}>
                <Badge>{item.year}</Badge>
                <p className={cn(typo.displaySm, "mt-base", tone.head)}>{item.text}</p>
                {item.desc ? (
                  <p className={cn(typo.bodyMd, "mt-xs", tone.body)}>{item.desc}</p>
                ) : null}
              </div>
            </Reveal>
          );
        })}
        <Link href="/about/history" className={cn(typo.button, "mt-base text-primary")}>
          전체 연혁 보기
        </Link>
      </Container>
    </section>
  );
}
