import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { ABOUT } from "@/constants/content";

export default function AboutPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>{ABOUT.title}</h1>

      <p className={cn(typo.titleLg, "mt-lg text-ink")}>{ABOUT.statement}</p>
      <div className={cn(typo.bodyMd, "mt-base max-w-[var(--container-modal)] text-body")}>
        {ABOUT.intro.map((p) => (
          <p key={p} className="mt-xs first:mt-0">
            {p}
          </p>
        ))}
      </div>

      {/* 로고 상징색 — 색 연출은 추후, 지금은 텍스트 데이터로 노출 */}
      <ul className="mt-xl grid gap-base sm:grid-cols-2">
        {ABOUT.symbolism.map((s) => (
          <li key={s.color} className="rounded-xl bg-surface-soft p-xl">
            <p className={cn(typo.titleSm, "text-ink")}>
              {s.color} · {s.title}
            </p>
            <div className={cn(typo.bodySm, "mt-xs text-muted")}>
              {s.lines.map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <section className="mt-xl">
        <h2 className={cn(typo.titleMd, "text-ink")}>{ABOUT.hope.heading}</h2>
        <p className={cn(typo.bodyMd, "mt-base max-w-[var(--container-modal)] text-body")}>
          {ABOUT.hope.body}
        </p>
      </section>

      <section className="mt-xl">
        <h2 className={cn(typo.titleMd, "text-ink")}>{ABOUT.story.heading}</h2>
        <div className={cn(typo.bodyMd, "mt-base max-w-[var(--container-modal)] text-body")}>
          {ABOUT.story.paragraphs.map((p) => (
            <p key={p} className="mt-base first:mt-0">
              {p}
            </p>
          ))}
        </div>
      </section>
    </Container>
  );
}
