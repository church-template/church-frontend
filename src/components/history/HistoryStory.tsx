"use client";

import { useRef } from "react";
import styles from "./HistoryStory.module.css";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { HistoryMedia } from "./HistoryMedia";
import { HistoryChapter } from "./HistoryChapter";
import { useHistoryScrollEngine } from "./useHistoryScrollEngine";
import type { HistoryContent } from "@/constants/content";

export interface HistoryStoryProps {
  content: HistoryContent;
}

// 연혁 — 차분한 에디토리얼 스크롤(당근 컬처 참고). 제목·시대 모두 동일 Reveal 등장(특별취급 히어로 없음).
// 데스크톱 2단: 좌 sticky 현재 시대 사진 / 우 카드 스택. active = 뷰포트 중앙 최근접 카드.
export function HistoryStory({ content }: HistoryStoryProps) {
  const cardsRef = useRef<(HTMLElement | null)[]>([]);
  const active = useHistoryScrollEngine(cardsRef);
  const activeItem = content.items[active] ?? content.items[0];

  return (
    <>
      {/* 제목 — 고정 히어로가 아니라 흐름의 한 블록. 시대 카드와 동일한 Reveal로 등장. */}
      <section className={styles.hero}>
        <Container>
          <Reveal>
            <h1 className={cn(typo.displayLg, "text-ink")}>{content.title}</h1>
            <p className={cn(typo.displaySm, "text-muted", styles.heroHead)}>{content.intro}</p>
          </Reveal>
        </Container>
      </section>

      <Container as="section" className={styles.timeline}>
        {/* 좌측 sticky — 현재 시대 사진만(라벨·연도 제거, 의미는 우측 카드가 담당) */}
        <aside className={styles.aside} aria-hidden="true">
          <div className={styles.asideMedia}>
            {activeItem.media ? <HistoryMedia media={activeItem.media} priority /> : null}
          </div>
        </aside>

        {/* 우측 카드 스택 */}
        <ol className={styles.cards}>
          {content.items.map((item, i) => (
            <HistoryChapter
              key={item.id}
              item={item}
              ref={(el) => {
                cardsRef.current[i] = el;
              }}
            />
          ))}
        </ol>
      </Container>
    </>
  );
}
