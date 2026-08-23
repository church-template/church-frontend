import type { MetadataRoute } from "next";
import { CHURCH_URL } from "@/constants/church";

// /robots.txt 자동 생성. 비공개(회원·인증·신규작성·쇼케이스)와 회원 전용 도메인
// (설교·갤러리·챌린지·차량운행 — 비로그인엔 로그인 안내만 보여 검색 가치 없음, 스펙 1장)을
// 크롤 차단하고 나머지는 허용한다.
// edit 페이지는 auth 게이팅이라 크롤러에 콘텐츠가 노출되지 않아 별도 차단하지 않는다.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/mypage/",
        "/login",
        "/signup",
        "/agreements",
        "/showcase",
        "/notices/new",
        "/events/new",
        "/bulletins/new",
        // 회원 전용 도메인 — /sermons가 /sermons/new까지 포섭한다.
        "/sermons",
        "/gallery",
        "/challenges",
        "/vehicle-runs",
      ],
    },
    sitemap: `${CHURCH_URL}/sitemap.xml`,
  };
}
