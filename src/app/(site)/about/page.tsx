import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { ABOUT } from "@/constants/content";

export default function AboutPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>{ABOUT.title}</h1>
      {/* 읽기 너비 제한 — 모달 폭 토큰(32rem)을 재사용; 전용 prose 토큰 도입 시 교체 */}
      <div className={cn(typo.bodyMd, "mt-lg max-w-[var(--container-modal)] text-body")}>
        {ABOUT.paragraphs.map((p) => (
          <p key={p} className="mt-base first:mt-0">
            {p}
          </p>
        ))}
      </div>
    </Container>
  );
}
