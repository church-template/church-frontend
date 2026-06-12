// src/app/(site)/sermons/[id]/page.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const { getSermon } = vi.hoisted(() => ({ getSermon: vi.fn() }));
vi.mock("@/lib/api/sermons", () => ({ getSermon }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock("@/components/sermons/SermonVideo", () => ({
  SermonVideo: ({ url }: { url: string }) => <div data-testid="video" data-url={url} />,
}));
vi.mock("@/components/sermons/SermonAudio", () => ({
  SermonAudio: ({ url }: { url: string }) => <div data-testid="audio" data-url={url} />,
}));

import SermonDetailPage from "./page";

afterEach(() => vi.clearAllMocks());

const base = {
  id: 7, title: "은혜의 강가에서", preacher: "김목사", series: "여름",
  scripture: "요 4:1-14", content: "# 제목\n말씀입니다", videoUrl: null, audioUrl: null,
  preachedAt: "2026-06-08", viewCount: 1240, createdAt: "2026-06-08T00:00:00",
  updatedAt: "2026-06-08T00:00:00", version: 0, tags: [{ id: 3, name: "주일설교" }],
  author: "홍길동",
};

describe("SermonDetailPage (상세)", () => {
  it("제목·클릭메타·조회수·본문을 합성(영상/오디오 없으면 생략)", async () => {
    getSermon.mockResolvedValueOnce(base);
    const { container } = render(
      await SermonDetailPage({ params: Promise.resolve({ id: "7" }) }),
    );
    expect(getSermon).toHaveBeenCalledWith(7);
    expect(screen.getByRole("heading", { name: "은혜의 강가에서" })).toBeDefined();
    // 설교자·시리즈·태그 클릭 필터
    expect(screen.getByRole("link", { name: "김목사" }).getAttribute("href")).toBe(
      `/sermons?preacher=${encodeURIComponent("김목사")}`,
    );
    expect(screen.getByRole("link", { name: "여름" }).getAttribute("href")).toBe(
      `/sermons?series=${encodeURIComponent("여름")}`,
    );
    expect(screen.getByRole("link", { name: "주일설교" }).getAttribute("href")).toBe(
      "/sermons?tagId=3",
    );
    // 조회수·작성자(서버 마스킹 그대로)·마크다운
    expect(container.textContent).toContain("1,240");
    expect(container.textContent).toContain("홍길동");
    expect(container.querySelector(".prose-church")?.textContent).toContain("말씀입니다");
    // 영상/오디오 null → 생략
    expect(screen.queryByTestId("video")).toBeNull();
    expect(screen.queryByTestId("audio")).toBeNull();
  });

  it("videoUrl·audioUrl 있으면 각 컴포넌트 렌더", async () => {
    getSermon.mockResolvedValueOnce({
      ...base,
      videoUrl: "https://youtu.be/abc123XYZ-9",
      audioUrl: "https://cdn.x.com/s.mp3",
    });
    render(await SermonDetailPage({ params: Promise.resolve({ id: "7" }) }));
    expect(screen.getByTestId("video").getAttribute("data-url")).toBe("https://youtu.be/abc123XYZ-9");
    expect(screen.getByTestId("audio").getAttribute("data-url")).toBe("https://cdn.x.com/s.mp3");
  });

  it("없는 설교(null)면 notFound", async () => {
    getSermon.mockResolvedValueOnce(null);
    await expect(
      SermonDetailPage({ params: Promise.resolve({ id: "99" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("비숫자 id면 notFound(fetch 미호출)", async () => {
    await expect(
      SermonDetailPage({ params: Promise.resolve({ id: "abc" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getSermon).not.toHaveBeenCalled();
  });

  it("id가 0·음수면 notFound(fetch 미호출)", async () => {
    await expect(
      SermonDetailPage({ params: Promise.resolve({ id: "0" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      SermonDetailPage({ params: Promise.resolve({ id: "-3" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getSermon).not.toHaveBeenCalled();
  });
});
