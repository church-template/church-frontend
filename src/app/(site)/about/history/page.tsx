import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { HISTORY } from "@/constants/content";

export default function HistoryPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>{HISTORY.title}</h1>
      <ul className="mt-lg flex flex-col gap-base">
        {HISTORY.items.map((it) => (
          <li key={it.year} className="flex gap-base">
            <span className={cn(typo.datetime, "shrink-0 text-primary")}>{it.year}</span>
            <span className={cn(typo.bodyMd, "text-body")}>{it.text}</span>
          </li>
        ))}
      </ul>
    </Container>
  );
}
