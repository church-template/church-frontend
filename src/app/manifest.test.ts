import { describe, it, expect } from "vitest";
import manifest from "./manifest";
import { CHURCH_NAME, CHURCH_DESCRIPTION } from "@/constants/church";

describe("manifest", () => {
  const m = manifest();

  it("이름·설명은 church.ts 상수 주입", () => {
    expect(m.name).toBe(CHURCH_NAME);
    expect(m.short_name).toBe(CHURCH_NAME);
    expect(m.description).toBe(CHURCH_DESCRIPTION);
  });

  it("standalone 설치 설정", () => {
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    expect(m.lang).toBe("ko");
    expect(m.background_color).toBe("#ffffff");
    expect(m.theme_color).toBe("#ffffff");
  });

  it("아이콘 3개 — any 2개 + maskable 1개", () => {
    expect(m.icons).toEqual([
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ]);
  });
});
