import { SiteShell } from "@/components/shell/SiteShell";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { CHURCH_NAME } from "@/constants/church";

// 임시 홈 — T08에서 CrossHero(14A) + 13.4 섹션으로 대체된다. 현재는 셸 검증용 플레이스홀더.
export default function Home() {
  return (
    <SiteShell>
      <Container as="section" className="py-section text-center">
        <h1 className={cn(typo.displayLg, "text-ink")}>{CHURCH_NAME}</h1>
        <p className={cn(typo.bodyMd, "mt-base text-muted")}>
          홈 페이지는 T08에서 구성됩니다.
        </p>
      </Container>
    </SiteShell>
  );
}
