import { Bus, Car, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/main/Reveal";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { LOCATION } from "@/constants/content";

// directions.key → 아이콘(표현용 매핑). 미정의 key는 Car로 폴백.
const DIRECTION_ICONS: Record<string, LucideIcon> = { car: Car, transit: Bus };

// 문의 밴드의 우측 컬럼 — 찾아오는 방법을 lucide 아이콘 카드로 세로 스택.
// 밴드 배경·컨테이너는 페이지가 소유한다(문의 카드와 한 그리드를 이루므로).
export function LocationDirections() {
  return (
    <section className="break-keep">
      <Reveal>
        <h2 className={cn(typo.titleLg, "text-ink")}>{LOCATION.directionsHeading}</h2>
      </Reveal>
      <ul className="mt-xl flex flex-col gap-base">
        {LOCATION.directions.map((item, i) => {
          const Icon = DIRECTION_ICONS[item.key] ?? Car;
          return (
            <li key={item.key}>
              <Reveal delay={i * 120}>
                <div className="flex flex-col gap-base rounded-xl border border-hairline bg-canvas p-xl">
                  <Icon size={32} className="text-primary" aria-hidden="true" />
                  <h3 className={cn(typo.titleMd, "text-ink")}>{item.title}</h3>
                  <div className={cn(typo.bodyMd, "text-body")}>
                    {item.lines.map((line) => (
                      <p key={line} className="mt-xs first:mt-0">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
