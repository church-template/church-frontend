import Image from "next/image";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { ABOUT } from "@/constants/content";

// 대표문구에서 강조 단어만 primary로(단일 액센트). 강조어가 없으면 평문 그대로.
function renderStatement(statement: string, highlight: string) {
  const at = statement.indexOf(highlight);
  if (!highlight || at === -1) {
    return statement;
  }
  return (
    <>
      {statement.slice(0, at)}
      <span className="text-primary">{highlight}</span>
      {statement.slice(at + highlight.length)}
    </>
  );
}

// 밴드1 — 흰 캔버스. 좌측 빅타이포(라벨·대표문구·인트로), 우측 로고.
// 데스크톱은 좌 텍스트/우 로고 세로 가운데, 모바일은 로고가 위로(가운데)·텍스트는 아래(좌측).
export function VisionHero() {
  return (
    <Container as="section" className="break-keep py-section">
      <div className="grid items-center gap-xl lg:grid-cols-[1fr_auto]">
        <Reveal>
          <p className={cn(typo.titleSm, "text-primary")}>{ABOUT.title}</p>
          <h1 className={cn(typo.displayMega, "mt-base text-ink")}>
            {renderStatement(ABOUT.statement, ABOUT.statementHighlight)}
          </h1>
          <div className={cn(typo.bodyLg, "mt-lg max-w-[var(--container-narrow)] text-body")}>
            {ABOUT.intro.map((line) => (
              <p key={line} className="mt-xs first:mt-0">
                {line}
              </p>
            ))}
          </div>
        </Reveal>

        <Reveal
          delay={120}
          className="order-first justify-self-center lg:order-none lg:justify-self-end"
        >
          <Image
            src="/onlyLogo.png"
            alt="은샘침례교회 로고"
            width={512}
            height={512}
            priority
            className="h-auto w-56 sm:w-64 lg:w-80"
          />
        </Reveal>
      </div>
    </Container>
  );
}
