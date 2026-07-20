import Link from "next/link";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { Card } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
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
                {/* 대표시간이 카드의 핵심 정보 — 예배명에 묻히지 않게 강조 위계(고령 가독, #109). */}
                <p className={cn(typo.datetimeLg, "mt-xs text-ink")}>{s.time}</p>
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
      {/* 예배를 보다가 설교로 가는 진입점 — 회원전용 안내(MemberGate)는 /sermons가 담당. */}
      <Reveal className="mt-xl">
        <Link href="/sermons" className={buttonVariants("primary")}>
          {WORSHIP.sermonCta}
        </Link>
      </Reveal>
    </Container>
  );
}
