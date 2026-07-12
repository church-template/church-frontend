import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { PastorPortrait } from "./PastorPortrait";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { PASTOR } from "@/constants/content";

// 밴드1 — 흰 캔버스 비대칭 4/8 스플릿(좌 초상 / 우 인사말 본문). intro·greeting 모두 흰 위(가독성).
// 초상 칼럼이 좁은 이유: 액자가 사진 비율(세로로 긴 초상)을 그대로 쓰므로 폭이 곧 높이다 —
// 5/7이면 액자가 본문보다 250px 솟는다.
export function PastorIntro() {
  return (
    <Container as="section" className="py-section">
      <Reveal>
        <div className="grid gap-xxl lg:grid-cols-[4fr_8fr] lg:items-start">
          <PastorPortrait image={PASTOR.image} />
          <div>
            <p className={cn(typo.captionStrong, "text-muted")}>{PASTOR.title}</p>
            <h1 className={cn(typo.displayMd, "mt-xs text-ink")}>
              {PASTOR.name}{" "}
              <span className={cn(typo.titleMd, "text-muted")}>{PASTOR.position}</span>
            </h1>
            <p className={cn(typo.datetime, "mt-xs text-muted")}>{PASTOR.degree}</p>
            <p className={cn(typo.bodyLg, "mt-lg text-body")}>{PASTOR.intro}</p>
            <div className={cn(typo.bodyLg, "mt-base text-body")}>
              {PASTOR.greeting.map((p) => (
                <p key={p} className="mt-base first:mt-0">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </Container>
  );
}
