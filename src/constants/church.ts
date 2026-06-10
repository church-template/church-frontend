// 교회 고유값·콘텐츠 상수.
// "환경"이 아니라 "교회"마다 다를 뿐이라 env가 아니라 상수로 둔다(매직스트링 방지).
// 컴포넌트는 이 상수를 import해서 쓴다 — 문자열 인라인 금지(가이드 12장).
import type { HeroMedia } from "@/hero/types";

export const CHURCH_NAME = "은샘교회";
export const CHURCH_DOMAIN = "example.org";

// 히어로 배경 — 정적 에셋(a안). public/ 에 파일을 두고 경로로 참조한다.
// (백엔드 미디어 서빙은 Range 미지원이라 영상 스트리밍에 부적합 — 백엔드 답변 E, 가이드 13.3)
export const HERO: HeroMedia = {
  type: "video",
  src: "/hero.mp4",
  poster: "/hero-poster.jpg",
};

// 풀스크린 후 등장 카피 — 줄 단위 배열이라 "\n" 이스케이프가 필요 없다.
export const HERO_CAPTION = ["말씀과 삶이 만나는 곳", "우리 동네의 교회"];
