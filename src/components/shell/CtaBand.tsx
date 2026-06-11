import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { Container } from "./Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { CTA_BAND } from "@/constants/content";

// 프리푸터 다크 밴드(DESIGN cta-band-dark). 헤드라인 display-lg + CTA 2개(primary pill + outline-on-dark).
export function CtaBand() {
  return (
    <section className="bg-surface-dark py-section">
      <Container className="flex flex-col items-center gap-lg text-center">
        <h2 className={cn(typo.displayLg, "text-on-dark")}>{CTA_BAND.heading}</h2>
        <div className="flex flex-col gap-sm sm:flex-row">
          <Link href="/about" className={buttonVariants("pillCta")}>
            {CTA_BAND.primary}
          </Link>
          {/* outline 보조 CTA도 pill-cta와 동일 크기(56px) — DESIGN.md가 CTA 밴드 버튼 둘 다 대형 필로 명시 */}
          <Link
            href="/about/location"
            className={cn(buttonVariants("outlineOnDark"), "h-14 px-8")}
          >
            {CTA_BAND.secondary}
          </Link>
        </div>
      </Container>
    </section>
  );
}
