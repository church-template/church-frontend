import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { HistoryMedia } from "./HistoryMedia";

describe("HistoryMedia", () => {
  it("이미지를 alt=''(장식)·src로 렌더한다", () => {
    const { container } = render(
      <HistoryMedia media={{ type: "image", src: "/history/2011-04.jpg", alt: "" }} />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("alt")).toBe("");
    expect(img?.getAttribute("src")).toBe("/history/2011-04.jpg");
    expect(img?.getAttribute("loading")).toBe("lazy");
  });

  it("priority면 eager 로딩", () => {
    const { container } = render(
      <HistoryMedia media={{ type: "image", src: "/x.jpg", alt: "" }} priority />,
    );
    expect(container.querySelector("img")?.getAttribute("loading")).toBe("eager");
  });

  it("video는 video 요소를 poster 보존하여 렌더한다", () => {
    const { container } = render(
      <HistoryMedia media={{ type: "video", src: "/x.mp4", poster: "/p.jpg" }} />,
    );
    expect(container.querySelector("video")?.getAttribute("poster")).toBe("/p.jpg");
  });

  it("video 실패 시 poster 이미지로 폴백한다", () => {
    const { container } = render(
      <HistoryMedia media={{ type: "video", src: "/x.mp4", poster: "/p.jpg" }} />,
    );
    fireEvent.error(container.querySelector("video")!);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector('img[src="/p.jpg"]')).not.toBeNull();
  });
});
