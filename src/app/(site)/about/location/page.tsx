import { Container } from "@/components/shell/Container";
import { buttonVariants } from "@/components/ui/Button";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { CHURCH_ADDRESS, MAP_EMBED_SRC, mapSearchUrl } from "@/constants/church";
import { LOCATION } from "@/constants/content";

export default function LocationPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>{LOCATION.title}</h1>

      <p className={cn(typo.bodyMd, "mt-lg text-ink")}>{CHURCH_ADDRESS}</p>
      <ul className="mt-sm flex flex-col gap-xs">
        {LOCATION.transit.map((t) => (
          <li key={t} className={cn(typo.bodySm, "text-muted")}>
            {t}
          </li>
        ))}
      </ul>

      <div className="mt-lg">
        {MAP_EMBED_SRC ? (
          <iframe
            src={MAP_EMBED_SRC}
            title="교회 위치 지도"
            loading="lazy"
            className="aspect-video w-full rounded-xl border border-hairline"
          />
        ) : (
          <a
            href={mapSearchUrl(CHURCH_ADDRESS)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants("secondary")}
          >
            지도에서 보기
          </a>
        )}
      </div>
    </Container>
  );
}
