import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { PASTOR } from "@/constants/content";

export default function PastorPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>{PASTOR.title}</h1>

      <p className={cn(typo.titleLg, "mt-lg text-ink")}>
        {PASTOR.name} {PASTOR.position}
      </p>
      <p className={cn(typo.bodySm, "mt-xs text-muted")}>{PASTOR.degree}</p>

      {/* 읽기 너비 제한 — 소개 페이지와 동일하게 모달 폭 토큰 재사용 */}
      <p className={cn(typo.bodyMd, "mt-lg max-w-[var(--container-modal)] text-body")}>
        {PASTOR.intro}
      </p>
      <div className={cn(typo.bodyMd, "mt-lg max-w-[var(--container-modal)] text-body")}>
        {PASTOR.greeting.map((p) => (
          <p key={p} className="mt-base first:mt-0">
            {p}
          </p>
        ))}
      </div>

      <section className="mt-xl">
        <h2 className={cn(typo.titleMd, "text-ink")}>{PASTOR.credentials.heading}</h2>
        <ul className="mt-base flex flex-col gap-xs">
          {PASTOR.credentials.items.map((c) => (
            <li key={c} className={cn(typo.bodySm, "text-muted")}>
              {c}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-xl">
        <h2 className={cn(typo.titleMd, "text-ink")}>{PASTOR.philosophy.heading}</h2>
        <ul className="mt-base flex flex-col gap-xs">
          {PASTOR.philosophy.items.map((p) => (
            <li key={p} className={cn(typo.bodySm, "text-muted")}>
              {p}
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
