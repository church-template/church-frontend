"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Reveal } from "@/components/main/Reveal";
import { HistoryMedia } from "./HistoryMedia";
import styles from "./HistoryStory.module.css";
import type { HistoryItem } from "@/constants/content";

export interface HistoryChapterProps {
  item: HistoryItem;
}

// 우측 시대 카드(에디토리얼). 진입 시 Reveal fade/slide-up. 사진은 모바일에서만(데스크톱은 좌측 aside가 담당).
// 연도 라벨은 항상 노출(의미·접근성). 스크롤 엔진이 카드 위치를 측정하는 타깃이라 forwardRef로 <li> 노출.
export const HistoryChapter = forwardRef<HTMLLIElement, HistoryChapterProps>(
  function HistoryChapter({ item }, ref) {
    const headingId = `${item.id}-h`;
    return (
      <li ref={ref} id={item.id} aria-labelledby={headingId} className={styles.card}>
        <Reveal>
          <div className={styles.cardInner}>
            {item.media ? (
              <div className={styles.cardMedia}>
                <HistoryMedia media={item.media} />
              </div>
            ) : null}
            <p data-history-el="year" className={cn(typo.datetime, "text-primary")}>
              {item.year}
            </p>
            <h2 id={headingId} className={cn(typo.displayMd, "text-ink")}>
              {item.text}
            </h2>
            <p className={cn(typo.bodyLg, "text-body")}>{item.desc}</p>
            <ul className={styles.cardDetails}>
              {item.details.map((d) => (
                <li key={d} className={cn(typo.bodyLg, "text-body")}>
                  {d}
                </li>
              ))}
            </ul>
            <p className={cn(typo.bodyLg, "text-ink", styles.cardSig)}>{item.significance}</p>
          </div>
        </Reveal>
      </li>
    );
  },
);
