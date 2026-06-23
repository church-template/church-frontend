import { Quote } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { Badge } from "@/components/ui/Badge";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { PASTOR } from "@/constants/content";

// 밴드2 — 다크 밴드 위 elevated 카드(인용). DESIGN '깊이가 더 필요하면 다크 밴드 elevated'(새 그림자 0).
// primary 액센트는 이 페이지에서 Badge 1회만 등장(희소할수록 강하다).
export function PastorQuote() {
  return (
    <section className="bg-surface-dark py-section">
      <Container>
        <Reveal>
          <figure className="rounded-xl bg-surface-dark-elevated p-xxl">
            <Quote size={32} aria-hidden className="text-on-dark-soft" />
            <blockquote className={cn(typo.displayLg, "mt-base text-on-dark")}>
              {PASTOR.pullQuote}
            </blockquote>
            <figcaption className="mt-lg">
              <Badge variant="primary">{`${PASTOR.position} ${PASTOR.name}`}</Badge>
            </figcaption>
          </figure>
        </Reveal>
      </Container>
    </section>
  );
}
