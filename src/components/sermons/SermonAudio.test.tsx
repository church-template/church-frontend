// src/components/sermons/SermonAudio.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SermonAudio } from "./SermonAudio";

describe("SermonAudio", () => {
  it("음원 파일(.mp3) → audio 플레이어", () => {
    const { container } = render(<SermonAudio url="https://cdn.x.com/s.mp3" />);
    expect(container.querySelector("audio")?.getAttribute("src")).toBe(
      "https://cdn.x.com/s.mp3",
    );
  });

  it("쿼리스트링 붙은 음원도 인식", () => {
    const { container } = render(<SermonAudio url="https://cdn.x.com/s.m4a?token=1" />);
    expect(container.querySelector("audio")).not.toBeNull();
  });

  it("음원 아닌 URL → '오디오 듣기' 링크", () => {
    render(<SermonAudio url="https://drive.google.com/file/123" />);
    expect(
      screen.getByRole("link", { name: "오디오 듣기" }).getAttribute("href"),
    ).toBe("https://drive.google.com/file/123");
  });

  it("위험한 스킴 URL은 렌더하지 않음", () => {
    const { container } = render(<SermonAudio url="javascript:alert(1)" />);
    expect(container.querySelector("audio")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
  });
});
