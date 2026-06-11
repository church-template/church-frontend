import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { VISION } from "@/constants/content";

export default function VisionPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>{VISION.title}</h1>
      <p className={cn(typo.titleLg, "mt-lg text-ink")}>{VISION.statement}</p>
      <ul className="mt-lg flex flex-col gap-sm">
        {VISION.points.map((p) => (
          <li key={p} className={cn(typo.bodyMd, "text-body")}>
            {p}
          </li>
        ))}
      </ul>
    </Container>
  );
}
