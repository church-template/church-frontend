import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { Card } from "@/components/ui/Card";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { WORSHIP, WORSHIP_SERVICES } from "@/constants/content";

// 흰 캔버스 — 정기 예배 2×2 카드(이름·대표시간·찬양시간·설명 3줄). 페이지 h1을 겸한다.
export function WorshipRegular() {
  return (
    <Container as="section" className="break-keep py-section">
      <Reveal>
        <h1 className={cn(typo.displayMd, "text-ink")}>{WORSHIP.title}</h1>
        <p className={cn(typo.bodyLg, "mt-base text-body")}>{WORSHIP.regularLead}</p>
      </Reveal>
      <ul className="mt-xxl grid gap-base sm:grid-cols-2">
        {WORSHIP_SERVICES.map((s, i) => (
          <li key={s.name}>
            <Reveal delay={i * 120} className="h-full">
              <Card surface="soft" className="h-full p-xl">
                <h3 className={cn(typo.titleMd, "text-ink")}>{s.name}</h3>
                <p className={cn(typo.datetime, "mt-xs text-body")}>{s.time}</p>
                {s.praise ? (
                  <p className={cn(typo.datetime, "mt-xxs text-muted")}>{s.praise}</p>
                ) : null}
                <div className={cn(typo.bodyMd, "mt-base text-body")}>
                  {s.notes.map((note) => (
                    <p key={note} className="mt-xs first:mt-0">
                      {note}
                    </p>
                  ))}
                </div>
              </Card>
            </Reveal>
          </li>
        ))}
      </ul>
    </Container>
  );
}
