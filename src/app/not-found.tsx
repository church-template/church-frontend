import Link from "next/link";
import { SiteShell } from "@/components/shell/SiteShell";
import { Container } from "@/components/shell/Container";
import { buttonVariants } from "@/components/ui/Button";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 루트 404 — 미매칭 URL + 공개 서버 페이지의 notFound()를 전역 catch(스펙 §8.1).
// 셸(헤더·푸터) 위에 얹히고, 에러 화면이라 CTA밴드는 끈다.
export default function NotFound() {
  return (
    <SiteShell showCtaBand={false}>
      <Container as="section" className="flex flex-col items-center gap-lg py-section text-center">
        <h1 className={cn(typo.displayMd, "text-ink")}>페이지를 찾을 수 없습니다</h1>
        <p className={cn(typo.bodyMd, "text-muted")}>
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Link href="/" className={buttonVariants("primary")}>
          홈으로
        </Link>
      </Container>
    </SiteShell>
  );
}
