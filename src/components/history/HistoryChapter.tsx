"use client";

import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Reveal } from "@/components/main/Reveal";
import { HistoryMedia } from "./HistoryMedia";
import styles from "./HistoryStory.module.css";
import type { HistoryItem } from "@/constants/content";

export interface HistoryChapterProps {
  item: HistoryItem;
  index: number; // 0기준 — 챕터 번호(01~)·미러 방향 파생
  dark?: boolean; // 마지막 챕터 다크 밴드(스펙 §3.3)
}

// 챕터 그리드(카카오 지속가능성 재해석, 스펙 §3.2). 번호는 장식(aria-hidden) — 순서 의미는 연도가 담당.
// 미러는 grid-template-areas만 뒤집고 DOM 순서는 유지해 읽기 순서를 보존한다.
export function HistoryChapter({ item, index, dark = false }: HistoryChapterProps) {
  const headingId = `${item.id}-h`;
  const num = String(index + 1).padStart(2, "0");
  const mirrored = index % 2 === 1;
  return (
    <li id={item.id} aria-labelledby={headingId} className={styles.card}>
      <Reveal>
        <div className={cn(styles.chapter, mirrored && styles.mirrored, dark && styles.dark)}>
          <div className={cn(styles.cell, styles.numCell)}>
            <span aria-hidden="true" className={cn(typo.displayXl, dark ? "text-on-dark" : "text-ink")}>
              {num}
            </span>
          </div>
          <div className={cn(styles.cell, styles.titleCell)}>
            <p className={cn(typo.datetime, dark ? "text-on-dark-soft" : "text-primary")}>{item.year}</p>
            <h2 id={headingId} className={cn(typo.displayMd, dark ? "text-on-dark" : "text-ink")}>
              {item.text}
            </h2>
          </div>
          <div className={cn(styles.cell, styles.mediaCell)}>
            {item.media ? <HistoryMedia media={item.media} priority={index === 0} /> : null}
          </div>
          <div className={cn(styles.cell, styles.spacerCell)} aria-hidden="true" />
          <div className={cn(styles.cell, styles.bodyCell)}>
            <p className={cn(typo.bodyLg, dark ? "text-on-dark-soft" : "text-body")}>{item.desc}</p>
            <ul className={styles.bodyDetails}>
              {item.details.map((d) => (
                <li key={d} className={cn(typo.bodyLg, dark ? "text-on-dark-soft" : "text-body")}>
                  {d}
                </li>
              ))}
            </ul>
            <p className={cn(typo.bodyLg, dark ? "text-on-dark" : "text-ink", styles.bodySig)}>
              {item.significance}
            </p>
          </div>
        </div>
      </Reveal>
    </li>
  );
}
