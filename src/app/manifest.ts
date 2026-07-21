import type { MetadataRoute } from "next";
import { CHURCH_NAME, CHURCH_DESCRIPTION } from "@/constants/church";

// PWA 홈 화면 설치용 manifest (Next 파일 컨벤션 — <link rel="manifest"> 자동 주입).
// 색상은 DESIGN.md canvas(흰색) 값 — manifest는 CSS 변수를 읽지 못해 여기서만 하드코딩한다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: CHURCH_NAME,
    short_name: CHURCH_NAME,
    description: CHURCH_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    lang: "ko",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
