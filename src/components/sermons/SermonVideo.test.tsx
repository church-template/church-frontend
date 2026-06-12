// src/components/sermons/SermonVideo.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SermonVideo } from "./SermonVideo";

describe("SermonVideo", () => {
  it("유튜브 URL → 썸네일+재생버튼, 클릭 시 iframe 교체", () => {
    const { container } = render(
      <SermonVideo url="https://youtu.be/abc123XYZ-9" title="설교영상" />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toContain("/vi/abc123XYZ-9/");
    expect(container.querySelector("iframe")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /재생/ }));
    expect(container.querySelector("iframe")?.getAttribute("src")).toContain(
      "/embed/abc123XYZ-9",
    );
  });

  it("비유튜브 URL → '영상 보기' 링크", () => {
    render(<SermonVideo url="https://example.com/sermon.mp4" title="설교영상" />);
    const link = screen.getByRole("link", { name: "영상 보기" });
    expect(link.getAttribute("href")).toBe("https://example.com/sermon.mp4");
  });

  it("위험한 스킴 URL은 렌더하지 않음", () => {
    const { container } = render(<SermonVideo url="javascript:alert(1)" title="설교영상" />);
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });
});
