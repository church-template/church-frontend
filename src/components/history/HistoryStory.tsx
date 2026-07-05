"use client";

import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { HistoryChapter } from "./HistoryChapter";
import styles from "./HistoryStory.module.css";
import type { HistoryContent } from "@/constants/content";

export interface HistoryStoryProps {
  content: HistoryContent;
}

// 연혁 — 에디토리얼 챕터 그리드(카카오 지속가능성 재해석, 스펙 2026-07-05).
// sticky aside·스크롤 엔진 없음: 챕터 <ol> + Reveal 등장만. 마지막 챕터는 다크 밴드.
export function HistoryStory({ content }: HistoryStoryProps) {
  const lastIndex = content.items.length - 1;
  return (
    <>
      {/* 제목 — 고정 히어로가 아니라 흐름의 한 블록. 챕터와 동일한 Reveal로 등장. */}
      <section className={styles.hero}>
        <Container>
          <Reveal>
            <h1 className={cn(typo.displayLg, "text-ink")}>{content.title}</h1>
            <p className={cn(typo.displaySm, "text-muted", styles.heroHead)}>{content.intro}</p>
          </Reveal>
        </Container>
      </section>

      <Container as="section" className={styles.timeline}>
        <ol className={styles.cards}>
          {content.items.map((item, i) => (
            <HistoryChapter key={item.id} item={item} index={i} dark={i === lastIndex} />
          ))}
        </ol>
      </Container>
    </>
  );
}
