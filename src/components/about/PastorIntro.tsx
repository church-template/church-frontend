import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { PastorPortrait } from "./PastorPortrait";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { PASTOR } from "@/constants/content";

// 밴드1 — 흰 캔버스 비대칭 5/7 스플릿(좌 초상 / 우 인사말 본문). intro·greeting 모두 흰 위(가독성).
export function PastorIntro() {
  return (
    <Container as="section" className="py-section">
      <Reveal>
        <div className="grid gap-xxl lg:grid-cols-[5fr_7fr] lg:items-start">
          <PastorPortrait image={PASTOR.image} />
          <div>
            <p className={cn(typo.captionStrong, "text-muted")}>{PASTOR.title}</p>
            <h1 className={cn(typo.displayMd, "mt-xs text-ink")}>
              {PASTOR.name}{" "}
              <span className={cn(typo.titleMd, "text-muted")}>{PASTOR.position}</span>
            </h1>
            <p className={cn(typo.datetime, "mt-xs text-muted")}>{PASTOR.degree}</p>
            <p className={cn(typo.bodyLg, "mt-lg text-body")}>{PASTOR.intro}</p>
            <div className={cn(typo.bodyLg, "mt-base text-body")}>
              {PASTOR.greeting.map((p) => (
                <p key={p} className="mt-base first:mt-0">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </Container>
  );
}
