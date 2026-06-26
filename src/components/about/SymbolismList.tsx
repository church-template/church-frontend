import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { ABOUT } from "@/constants/content";

// symbolism 배열 순서(파랑·초록·빨강·주황)에 맞춘 상징색 점. 색은 콘텐츠라 인덱스 매핑(표현용).
const SYMBOL_DOT = [
  "bg-symbol-blue",
  "bg-symbol-green",
  "bg-symbol-red",
  "bg-symbol-orange",
] as const;

// 제목의 색이름 단어("파랑색" 등)에 입히는 글자색. 점과 같은 순서.
const SYMBOL_TEXT = [
  "text-symbol-blue",
  "text-symbol-green",
  "text-symbol-red",
  "text-symbol-orange",
] as const;

// 밴드2 — 회색. 로고 4색을 01–04 넘버드 에디토리얼 리스트로(큰 색면 없이 작은 점·헤어라인만).
export function SymbolismList() {
  return (
    <section className="break-keep bg-surface-soft py-section">
      <Container>
        <div className="grid gap-base lg:grid-cols-[1fr_1.4fr] lg:items-baseline lg:gap-xxl">
          <Reveal>
            <h2 className={cn(typo.displayMd, "text-ink")}>{ABOUT.symbolismHeading}</h2>
          </Reveal>
          <Reveal delay={80}>
            <p className={cn(typo.bodyMd, "text-body")}>{ABOUT.symbolismLead}</p>
          </Reveal>
        </div>

        <ul className="mt-xxl border-t border-hairline">
          {ABOUT.symbolism.map((symbol, i) => (
            <li key={symbol.color} className="border-b border-hairline">
              <Reveal delay={i * 120}>
                <div className="py-xl">
                  <div className="flex items-center gap-sm">
                    <span
                      className={cn("size-3 shrink-0 rounded-full", SYMBOL_DOT[i])}
                      aria-hidden="true"
                    />
                    <h3 className={cn(typo.titleLg, "text-ink")}>
                      <span className={SYMBOL_TEXT[i]}>{symbol.color}</span>
                      {` · ${symbol.title}`}
                    </h3>
                  </div>
                  <div className={cn(typo.bodyLg, "mt-sm text-ink")}>
                    {symbol.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
