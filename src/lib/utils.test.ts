import { describe, it, expect } from "vitest";
import { cn } from "./utils";
import { typo } from "@/constants/typography";

// tailwind-merge 기본 설정은 미지의 `text-*`를 색상으로 분류해, 커스텀 타이포 토큰과
// 색 토큰을 같은 그룹으로 보고 앞쪽(크기)을 제거한다 — T08에서 발견된 전역 타이포 붕괴.
// 이 테스트가 그 회귀를 잠근다.
describe("cn — 커스텀 타이포 토큰 병합", () => {
  it("타이포 크기 + 색 토큰이 공존한다(크기 클래스 제거 금지)", () => {
    expect(cn(typo.displayLg, "text-ink")).toBe("text-display-lg text-ink");
    expect(cn(typo.displaySm, "mt-base", "text-on-dark")).toContain("text-display-sm");
    // 복합 토큰(datetime = 크기 + tabular-nums)은 양쪽 모두 생존해야 한다
    expect(cn(typo.datetime, "text-muted")).toBe("text-datetime tabular-nums text-muted");
    expect(cn(typo.titleMd, "text-on-dark")).toContain("text-title-md");
  });

  it("같은 그룹끼리는 여전히 충돌을 해소한다", () => {
    expect(cn(typo.titleMd, typo.titleLg)).toBe("text-title-lg");
    expect(cn("text-ink", "text-on-dark")).toBe("text-on-dark");
  });
});
