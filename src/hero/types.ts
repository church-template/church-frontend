// 히어로 미디어 — 영상/이미지를 동등하게 지원하는 판별 유니온.
// CrossHero(T8, 메인)·DeptHero(T9, 부서)가 공유한다. (가이드 13.3 / 14A·14B)
export type HeroMedia =
  | { type: "video"; src: string; poster?: string }
  | { type: "image"; src: string; alt?: string };
