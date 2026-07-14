import type { CSSProperties } from "react";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { PastorPortrait } from "./PastorPortrait";
import styles from "./PastorIntro.module.css";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { PASTOR } from "@/constants/content";

// 리딩 스포트라이트 입력 — 본문을 문장으로 쪼개 스크롤 구간을 문장 수만큼 나눈다(한 문장씩 강조).
// 상수 콘텐츠라 모듈 로드 시 1회 계산. 인덱스는 문단을 가로질러 이어진다.
const PARAGRAPHS = [PASTOR.intro, ...PASTOR.greeting].map((text) =>
  text.split(/(?<=\.)\s+/),
);
const SENTENCE_COUNT = PARAGRAPHS.reduce((n, p) => n + p.length, 0);
const FIRST_INDEX = PARAGRAPHS.map((_, i) =>
  PARAGRAPHS.slice(0, i).reduce((n, p) => n + p.length, 0),
);

// 밴드1 — 흰 캔버스 비대칭 4/8 스플릿(좌 초상 / 우 인사말 본문). intro·greeting 모두 흰 위(가독성).
// 초상 칼럼이 좁은 이유: 액자가 사진 비율(세로로 긴 초상)을 그대로 쓰므로 폭이 곧 높이다 —
// 5/7이면 액자가 본문보다 250px 솟는다.
export function PastorIntro() {
  return (
    // stage/pinned — 데스크톱에서 섹션을 화면에 고정한 채 강조가 문장을 하나씩 밟고 내려간 뒤
    // 페이지가 다음으로 넘어간다. 고정 길이는 문장 수에 비례(--sentences). 모바일·미지원은 평범한 섹션.
    <section
      className={styles.stage}
      style={{ "--sentences": SENTENCE_COUNT } as CSSProperties}
    >
      <div className={styles.pinned}>
        <Container className={cn("py-section", styles.frame)}>
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
                {/* 기본은 bodyLg(24px) — 켜진 문장만 bodyXl(32px·600)로 부푼다. data-reading은 테스트 훅. */}
                <div className={cn(typo.bodyLg, "mt-lg", styles.reading)} data-reading>
                  {PARAGRAPHS.map((sentences, pi) => (
                    <p key={sentences[0]} className="mt-base first:mt-0">
                      {sentences.map((sentence, si) => (
                        <span
                          key={sentence}
                          className={styles.sentence}
                          style={{ "--i": FIRST_INDEX[pi] + si } as CSSProperties}
                        >
                          {sentence}{" "}
                        </span>
                      ))}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </div>
    </section>
  );
}
