import type { MetadataRoute } from "next";
import { CHURCH_URL } from "@/constants/church";
import { DEPARTMENTS, allDepartmentSlugs } from "@/constants/departments";

// 공개 정적 라우트. 설교·갤러리·챌린지는 회원 전용 전환으로 수집 제외(스펙 1장).
const PUBLIC_PATHS = [
  "",
  "/about",
  "/about/history",
  "/about/location",
  "/about/pastor",
  "/about/photos",
  "/worship",
  "/notices",
  "/bulletins",
  "/events",
  "/departments",
];

// /sitemap.xml 자동 생성. 부서 상세는 프론트 상수(DEPARTMENTS) 구동이라 백엔드 없이 정적으로 포함한다
// (allDepartmentSlugs는 generateStaticParams와 같은 헬퍼라 sitemap URL이 실제 라우트와 정확히 일치).
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const staticEntries = PUBLIC_PATHS.map((path) => ({
    url: `${CHURCH_URL}${path}`,
    lastModified,
  }));
  const deptEntries = allDepartmentSlugs(DEPARTMENTS).map((slug) => ({
    url: `${CHURCH_URL}/departments/${slug}`,
    lastModified,
  }));
  return [...staticEntries, ...deptEntries];
}
