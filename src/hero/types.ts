// 히어로 미디어 — 영상/이미지를 동등하게 지원하는 판별 유니온.
// CrossHero(T8, 메인)·DeptHero(T9, 부서)가 공유한다. (가이드 13.3 / 14A·14B)
export type HeroMedia =
  | { type: "video"; src: string; poster?: string }
  | { type: "image"; src: string; alt?: string };

// 콜라주 타일 — HeroReveal 전용. 비율이 레이아웃의 **입력**이라 필수다: 컬럼 폭을 사진 비율에서
// 역산해 좌·우 컬럼과 중앙 카드의 높이를 맞추기 때문이다(크롭 0). HeroMedia에 aspect를 붙이지
// 않는 이유는 CrossHero·DeptHero가 그 타입을 공유하는데 비율을 알 필요가 없어서다.
export interface CollageTile {
  src: string;
  alt?: string;
  /** 가로 / 세로 */
  aspect: number;
}
