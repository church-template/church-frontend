import type { MetadataRoute } from "next";
import { CHURCH_URL } from "@/constants/church";
import { DEPARTMENTS, allDepartmentSlugs } from "@/constants/departments";

// 공개 정적 라우트. 상세([id])는 백엔드 fetch가 필요해 이번 범위 밖(후속).
const PUBLIC_PATHS = [
  "",
  "/about",
  "/about/history",
  "/about/location",
  "/about/pastor",
  "/about/photos",
  "/worship",
  "/sermons",
  "/notices",
  "/bulletins",
  "/events",
  "/gallery",
  "/challenges",
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
