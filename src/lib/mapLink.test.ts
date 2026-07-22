import { describe, it, expect } from "vitest";
import { kakaoMapPinUrl } from "./mapLink";

describe("kakaoMapPinUrl", () => {
  it("좌표와 라벨로 카카오맵 핀 URL을 만든다", () => {
    expect(kakaoMapPinUrl(37.5665, 126.978, "정문")).toBe(
      "https://map.kakao.com/link/map/%EC%A0%95%EB%AC%B8,37.5665,126.978",
    );
  });

  it("라벨 생략 시 기본 '픽업 위치'", () => {
    expect(kakaoMapPinUrl(37.5, 127.0)).toBe(
      "https://map.kakao.com/link/map/%ED%94%BD%EC%97%85%20%EC%9C%84%EC%B9%98,37.5,127",
    );
  });

  it("undefined 라벨이면 기본값이 적용된다", () => {
    expect(kakaoMapPinUrl(37.5, 127.0, undefined)).toContain("/%ED%94%BD%EC%97%85%20%EC%9C%84%EC%B9%98,");
  });
});
