import Link from "next/link";
import { Container } from "./Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import {
  CHURCH_NAME,
  CHURCH_NAME_FULL,
  CHURCH_ADDRESS,
  CHURCH_PHONE,
  CHURCH_EMAIL,
} from "@/constants/church";
import { FOOTER_COLUMNS } from "@/constants/navigation";

// footer-light(교회 정보 + 링크열) + legal-band(저작권). canvas 배경, 헤어라인 구분.
export function SiteFooter() {
  // 요청/ISR 렌더 시점의 연도. revalidate를 연 단위로 길게 잡지 않는 한 어긋날 일 없다.
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-hairline bg-canvas">
      {/* lg는 6열: 브랜드/교회정보가 2열을 차지해 주소가 한 줄로 들어가고, 나머지 4개 링크열이 1열씩 채운다(2+4=6). */}
      <Container className="grid gap-xl py-xxl sm:grid-cols-2 lg:grid-cols-6">
        <div className="flex flex-col gap-xs lg:col-span-2">
          <span className={cn(typo.titleMd, "text-primary")}>{CHURCH_NAME}</span>
          {/* 주소는 한 줄 유지 — 좁은 컬럼에서 "260"만 다음 줄로 떨어지는 것 방지(전화·이메일은 짧아 영향 없음) */}
          <address className={cn(typo.bodyMd, "not-italic text-muted whitespace-nowrap")}>
            {CHURCH_ADDRESS}
            <br />
            {/* 명시적 tel: 링크 — iOS Safari가 평문 번호를 자동으로 <a>로 감싸 하이드레이션 불일치를 내던 것을
                layout의 formatDetection(telephone=no)으로 끄는 대신, 탭 통화는 여기서 직접 제공한다 */}
            <a href={`tel:${CHURCH_PHONE}`} className="hover:text-primary">
              {CHURCH_PHONE}
            </a>
            <br />
            {CHURCH_EMAIL}
          </address>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-xs">
            <span className={cn(typo.captionStrong, "text-muted")}>{col.title}</span>
            {col.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(typo.bodyMd, "text-body hover:text-ink")}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </Container>
      {/* legal band 구분선: 주 hairline보다 연하게 — 위계 없이 영역만 나눈다 */}
      <div className="border-t border-hairline-soft">
        <Container className="py-base">
          <p className={cn(typo.caption, "text-center text-muted")}>
            © {year} {CHURCH_NAME_FULL}. All rights reserved.
          </p>
        </Container>
      </div>
    </footer>
  );
}
