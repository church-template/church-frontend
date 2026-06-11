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

// 교회 소재지·연락처 — 푸터·오시는 길에서 소비. 교회별 값이라 상수(env 아님, 스펙 D2).
export const CHURCH_ADDRESS = "서울특별시 ○○구 ○○로 00";
export const CHURCH_PHONE = "02-000-0000";
export const CHURCH_EMAIL = `info@${CHURCH_DOMAIN}`;

// 오시는 길 지도 임베드 URL(카카오/네이버 등). 비어 있으면 외부 지도 링크로 폴백(라이브러리 미사용).
export const MAP_EMBED_SRC = "";

// 임베드 미설정 시 외부 지도 폴백 — 교회/배포처가 지도 제공자를 바꿀 수 있게 상수로 노출.
export const mapSearchUrl = (address: string) =>
  `https://map.kakao.com/?q=${encodeURIComponent(address)}`;
