"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./CrossHero.module.css";
import type { HeroMedia } from "./types";

interface CrossHeroProps {
  caption: ReactNode; // 풀스크린 후 등장 카피
  media: HeroMedia; // 배경(십자가 너머의 세계)
}

// 확정 비율 (14A.3) — 변경 시 디자인 재검토 필요
const CROSS = { vbw: 16, haw: 64, hbh: 16, cp: 32 };
const START_PCT = 38; // 시작 크기 %
const DIM = 0.85; // 덮개 어둡기

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const segment = (p: number, s: number, e: number) => clamp01((p - s) / (e - s));
const easeIn = (t: number) => t * t * t;

function buildCrossPath() {
  const v = CROSS.vbw / 2,
    h = CROSS.haw / 2;
  const cY = -50 + CROSS.cp;
  const t1 = cY - CROSS.hbh / 2,
    t2 = cY + CROSS.hbh / 2;
  return `M ${-v} -50 H ${v} V ${t1} H ${h} V ${t2} H ${v} V 50 H ${-v} V ${t2} H ${-h} V ${t1} H ${-v} Z`;
}

export default function CrossHero({ caption, media }: CrossHeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const holeRef = useRef<SVGPathElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const hero = heroRef.current!,
      sticky = stickyRef.current!;
    const hole = holeRef.current!,
      captionEl = captionRef.current!;

    let startScale = 1,
      targetScale = 10,
      cx = 0,
      cy = 0,
      ticking = false;

    const measure = () => {
      const vw = sticky.clientWidth,
        vh = sticky.clientHeight;
      cx = vw / 2;
      cy = vh / 2;
      startScale = (Math.min(vw, vh) * (START_PCT / 100)) / 100;
      targetScale = Math.max(vw / CROSS.vbw, vh / 100) * 1.1;
      update();
    };

    const update = () => {
      const total = hero.offsetHeight - window.innerHeight;
      const p = clamp01((window.scrollY - hero.offsetTop) / total);

      const pe = easeIn(segment(p, 0, 0.72));
      const s = lerp(startScale, targetScale, pe);
      hole.setAttribute("transform", `translate(${cx} ${cy}) scale(${s})`);

      const pc = segment(p, 0.78, 0.95);
      captionEl.style.opacity = String(pc);
      captionEl.style.transform = `translateY(calc(-50% + ${lerp(30, 0, pc)}px))`;

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    measure();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section ref={heroRef} className={styles.hero}>
      <div ref={stickyRef} className={styles.sticky}>
        <div className={styles.bg}>
          {media.type === "video" && !videoFailed ? (
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              src={media.src}
              poster={media.poster}
              onError={() => setVideoFailed(true)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.type === "video" ? (media.poster ?? "") : media.src}
              alt={media.type === "image" ? (media.alt ?? "") : ""}
            />
          )}
        </div>

        <svg className={styles.cover} aria-hidden="true">
          <defs>
            <mask id="crossMask">
              <rect width="100%" height="100%" fill="white" />
              <path ref={holeRef} d={buildCrossPath()} fill="black" />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill={`rgba(10,15,31,${DIM})`}
            mask="url(#crossMask)"
          />
        </svg>

        <p ref={captionRef} className={styles.caption}>
          {caption}
        </p>
      </div>
    </section>
  );
}
