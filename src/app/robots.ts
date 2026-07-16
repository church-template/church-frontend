import type { MetadataRoute } from "next";
import { CHURCH_URL } from "@/constants/church";

// /robots.txt 자동 생성. 비공개(회원·인증·신규작성·쇼케이스)만 크롤 차단하고 나머지는 허용한다.
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
        "/sermons/new",
      ],
    },
    sitemap: `${CHURCH_URL}/sitemap.xml`,
  };
}
