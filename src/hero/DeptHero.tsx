'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './DeptHero.module.css';
import type { HeroMedia } from './types';

interface DeptHeroProps {
  title: string;
  caption: React.ReactNode;
  media: HeroMedia;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const segment = (p: number, s: number, e: number) => clamp01((p - s) / (e - s));

export default function DeptHero({ title, caption, media }: DeptHeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const hero = heroRef.current!;
    const sticky = stickyRef.current!;
    const frame = frameRef.current!;
    const mediaEl = mediaRef.current!;
    const titleEl = titleRef.current!;
    const captionEl = captionRef.current!;

    let startInset = { top: 0, right: 0, bottom: 0, left: 0 };
    let ticking = false;

    const measure = () => {
      const s = sticky.getBoundingClientRect();
      const r = frame.getBoundingClientRect();
      startInset = {
        top: r.top - s.top,
        left: r.left - s.left,
        right: s.right - r.right,
        bottom: s.bottom - r.bottom, // 레이아웃상 0 (하단 패딩 없음)
      };
      update();
    };

    const update = () => {
      const total = hero.offsetHeight - window.innerHeight;
      const p = clamp01((window.scrollY - hero.offsetTop) / total);

      const pe = segment(p, 0, 0.55);
      const radius = lerp(24, 0, pe);
      mediaEl.style.clipPath =
        `inset(${lerp(startInset.top, 0, pe)}px ` +
        `${lerp(startInset.right, 0, pe)}px ` +
        `${lerp(startInset.bottom, 0, pe)}px ` +
        `${lerp(startInset.left, 0, pe)}px ` +
        `round ${radius}px ${radius}px 0 0)`;

      const pt = segment(p, 0, 0.35);
      titleEl.style.transform = `translateY(${lerp(0, -80, pt)}px)`;
      titleEl.style.opacity = String(1 - pt);

      const pc = segment(p, 0.6, 0.9);
      captionEl.style.opacity = String(pc);
      captionEl.style.transform = `translateY(calc(-50% + ${lerp(30, 0, pc)}px))`;

      ticking = false;
    };

    const onScroll = () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    measure();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <section ref={heroRef} className={styles.hero}>
      <div ref={stickyRef} className={styles.sticky}>
        <div className={styles.layout}>
          <h1 ref={titleRef} className={styles.title}>{title}</h1>
          <div ref={frameRef} className={styles.frame} aria-hidden="true" />
        </div>

        <div ref={mediaRef} className={styles.media}>
          {media.type === 'video' && !videoFailed ? (
            <video autoPlay muted loop playsInline preload="metadata"
              src={media.src} poster={media.poster}
              onError={() => setVideoFailed(true)} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.type === 'video' ? (media.poster ?? '') : media.src}
              alt={media.type === 'image' ? (media.alt ?? '') : ''} />
          )}
        </div>

        <p ref={captionRef} className={styles.caption}>{caption}</p>
      </div>
    </section>
  );
}
