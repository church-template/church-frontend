// 교회 고유값·콘텐츠 상수.
// "환경"이 아니라 "교회"마다 다를 뿐이라 env가 아니라 상수로 둔다(매직스트링 방지).
// 컴포넌트는 이 상수를 import해서 쓴다 — 문자열 인라인 금지(가이드 12장).
import type { HeroMedia } from "@/hero/types";

export const CHURCH_NAME = "은샘교회";
// 정식 명칭 — 저작권·약관 등 공식 표기용. 헤더·푸터 로고는 약칭 CHURCH_NAME을 쓴다.
export const CHURCH_NAME_FULL = "기독교 한국침례회 은샘교회";
// 교회 공식 도메인. 현재 코드에서 URL 생성(canonical·og 등)에 쓰이지 않아 값만 정확히 둔다
// (실제 DNS 연결은 별개 — 추후 SEO 메타 도입 시 그대로 사용).
export const CHURCH_DOMAIN = "eunsaem.com";

// 교회 로고 이미지 — 소개 히어로 등에서 소비. 교회별 자산이라 상수로 둔다.
// alt는 약칭 CHURCH_NAME 기준(DESIGN.md: 로고 표기는 약칭 사용).
export const CHURCH_LOGO = {
  src: "/onlyLogo.png",
  alt: `${CHURCH_NAME} 로고`,
} as const;

// 히어로 배경 — 정적 에셋(a안). public/ 에 파일을 두고 경로로 참조한다.
// (백엔드 미디어 서빙은 Range 미지원이라 영상 스트리밍에 부적합 — 백엔드 답변 E, 가이드 13.3)
export const HERO: HeroMedia = {
  type: "video",
  src: "/hero.mp4",
  poster: "/hero-poster.jpeg",
};

// 풀스크린 후 등장 카피 — 줄 단위 배열이라 "\n" 이스케이프가 필요 없다.
export const HERO_CAPTION = [
  "함께함이 축복이 되는 교회",
  "은샘교회에 오신 것을 환영합니다",
];

// 콜라주 타일(MediaCollage 스펙 C2·C4) — 데스크톱 4장, 모바일은 앞 2장만 노출(컴포넌트가 처리).
// 장식 미디어라 alt 기본 "". 의미 있는 사진으로 교체 시 alt도 채운다.
export const COLLAGE_TILES: HeroMedia[] = [
  { type: "image", src: "/collage-1.jpg", alt: "" },
  { type: "image", src: "/collage-2.jpg", alt: "" },
  { type: "image", src: "/collage-3.jpg", alt: "" },
  { type: "image", src: "/collage-4.jpg", alt: "" },
];

// 교회 소재지·연락처 — 푸터·오시는 길에서 소비. 교회별 값이라 상수(env 아님, 스펙 D2).
export const CHURCH_ADDRESS = "충청남도 예산군 삽교읍 수암산로 260";
export const CHURCH_PHONE = "041-337-2298";
// 교회 대표 이메일 — 도메인 메일이 아니라 실제 사용 중인 주소라 리터럴로 둔다.
export const CHURCH_EMAIL = "hsk71418@naver.com";

// 오시는 길 지도 임베드 URL(카카오/네이버 등). 비어 있으면 외부 지도 링크로 폴백(라이브러리 미사용).
// 오시는 길 지도 임베드 URL(카카오/네이버 등). 비어 있으면 외부 지도 링크로 폴백(라이브러리 미사용).
export const MAP_EMBED_SRC = "";

// 임베드 미설정 시 외부 지도 폴백 — 교회/배포처가 지도 제공자를 바꿀 수 있게 상수로 노출.
export const mapSearchUrl = (address: string) =>
  `https://map.kakao.com/?q=${encodeURIComponent(address)}`;

// 네이버지도 폴백 — 카카오와 함께 외부 지도 선택지로 제공(둘 다 주소 검색).
export const naverMapSearchUrl = (address: string) =>
  `https://map.naver.com/p/search/${encodeURIComponent(address)}`;
