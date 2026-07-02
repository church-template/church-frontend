import Link from "next/link";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { buttonVariants } from "@/components/ui/Button";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { CHURCH_ADDRESS, CHURCH_PHONE } from "@/constants/church";
import { WORSHIP } from "@/constants/content";

// 다크 밴드 — 좌: 장소 안내(주소·문의·오시는 길 링크) / 우: 참석 안내. 지도는 /about/location 위임.
export function WorshipPlace() {
  return (
    <section className="break-keep bg-surface-dark py-section">
      <Container>
        <Reveal>
          <div className="grid gap-xl lg:grid-cols-2 lg:items-start">
            {/* 좌 — 장소 안내 */}
            <div>
              <h2 className={cn(typo.titleLg, "text-on-dark")}>{WORSHIP.placeHeading}</h2>
              <p className={cn(typo.bodyLg, "mt-base text-on-dark-soft")}>{WORSHIP.placeLead}</p>
              <dl className="mt-xl grid gap-lg">
                <div>
                  <dt className={cn(typo.captionStrong, "text-on-dark-soft")}>주소</dt>
                  <dd className={cn(typo.bodyMd, "mt-xs text-on-dark")}>{CHURCH_ADDRESS}</dd>
                  <dd className={cn(typo.bodyMd, "mt-xxs text-on-dark-soft")}>
                    {WORSHIP.placeLandmark}
                  </dd>
                </div>
                <div>
                  <dt className={cn(typo.captionStrong, "text-on-dark-soft")}>문의</dt>
                  <dd className={cn(typo.bodyMd, "mt-xs text-on-dark")}>
                    <a href={`tel:${CHURCH_PHONE}`} className="hover:text-primary">
                      {CHURCH_PHONE}
                    </a>
                  </dd>
                </div>
              </dl>
              <Link
                href="/about/location"
                className={cn(buttonVariants("outlineOnDark"), "mt-xl h-14 px-8")}
              >
                오시는 길 자세히
              </Link>
            </div>
            {/* 우 — 참석 안내 */}
            <div>
              <h3 className={cn(typo.titleMd, "text-on-dark")}>{WORSHIP.attendHeading}</h3>
              <p className={cn(typo.bodyMd, "mt-base text-on-dark-soft")}>{WORSHIP.attendLead}</p>
              <div className={cn(typo.bodyMd, "mt-base text-on-dark")}>
                {WORSHIP.attendNotes.map((note) => (
                  <p key={note} className="mt-sm first:mt-0">
                    {note}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
