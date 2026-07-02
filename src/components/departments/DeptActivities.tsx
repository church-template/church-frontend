import { Check } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 주요 활동 — 헤어라인으로 구분되는 목록. 선두 체크(currentColor=primary)는 항목 마커.
export function DeptActivities({ heading, items }: { heading: string; items: string[] }) {
  return (
    <Container as="section" className="break-keep py-section">
      <Reveal>
        <h2 className={cn(typo.displayMd, "text-ink")}>{heading}</h2>
        <ul className="mt-lg">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-center gap-sm border-b border-hairline py-base last:border-b-0"
            >
              <Check size={20} aria-hidden className="shrink-0 text-muted" />
              <span className={cn(typo.bodyLg, "text-body")}>{item}</span>
            </li>
          ))}
        </ul>
      </Reveal>
    </Container>
  );
}
