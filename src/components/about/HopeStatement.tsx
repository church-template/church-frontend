import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { ABOUT } from "@/constants/content";

// 밴드3 — 흰 캔버스. 좌측 소제목 / 우측 큰 본문(읽는 본문 lead). 4색을 잇는 소망 진술.
export function HopeStatement() {
  return (
    <Container as="section" className="break-keep py-section">
      <div className="grid gap-lg lg:grid-cols-[1fr_1.6fr] lg:gap-xxl">
        <Reveal>
          <h2 className={cn(typo.displayMd, "text-ink")}>{ABOUT.hope.heading}</h2>
        </Reveal>
        <Reveal delay={80}>
          <p className={cn(typo.bodyLg, "text-ink")}>{ABOUT.hope.body}</p>
        </Reveal>
      </div>
    </Container>
  );
}
