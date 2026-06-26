import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { ABOUT } from "@/constants/content";

// 소망 본문 세그먼트의 color → 상징색 글자. color 없는 조각은 평문(text-ink 상속).
const SYMBOL_TEXT: Record<string, string> = {
  blue: "text-symbol-blue",
  green: "text-symbol-green",
  red: "text-symbol-red",
  orange: "text-symbol-orange",
};

// 밴드3 — 흰 캔버스. 좌측 소제목 / 우측 큰 본문(읽는 본문 lead). 4색을 잇는 소망 진술.
export function HopeStatement() {
  return (
    <Container as="section" className="break-keep py-section">
      <div className="grid gap-lg lg:grid-cols-[1fr_1.6fr] lg:gap-xxl">
        <Reveal>
          <h2 className={cn(typo.displayMd, "text-ink")}>{ABOUT.hope.heading}</h2>
        </Reveal>
        <Reveal delay={80}>
          <p className={cn(typo.bodyLg, "text-ink")}>
            {ABOUT.hope.body.map((seg) =>
              seg.color ? (
                <span key={seg.text} className={cn(typo.bodyLgStrong, SYMBOL_TEXT[seg.color])}>
                  {seg.text}
                </span>
              ) : (
                seg.text
              ),
            )}
          </p>
        </Reveal>
      </div>
    </Container>
  );
}
