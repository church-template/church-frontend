import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const { getNotice } = vi.hoisted(() => ({ getNotice: vi.fn() }));
vi.mock("@/lib/api/notices", () => ({ getNotice }));
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
// 클라이언트 island는 스텁(useMe·QueryClientProvider 의존 차단) — 단위 테스트가 커버.
vi.mock("@/components/notices/NoticeAdminActions", () => ({ NoticeDetailActions: () => null }));

import NoticeDetailPage from "./page";

afterEach(() => vi.clearAllMocks());

const base = {
  id: 5, title: "2026 여름 수련회 안내", content: "# 안내\n수련회 일정입니다",
  isPinned: false, viewCount: 142, createdAt: "2026-06-01T09:00:00",
  updatedAt: "2026-06-01T09:00:00", version: 0,
  tags: [{ id: 3, name: "행사" }], author: "홍길동",
};

describe("NoticeDetailPage (상세)", () => {
  it("제목·메타(날짜·조회수·작성자)·태그·본문 합성(고정 아님 → 배지 없음)", async () => {
    getNotice.mockResolvedValueOnce(base);
    const { container } = render(
      await NoticeDetailPage({ params: Promise.resolve({ id: "5" }) }),
    );
    expect(getNotice).toHaveBeenCalledWith(5);
    expect(screen.getByRole("heading", { name: "2026 여름 수련회 안내" })).toBeDefined();
    // 메타: 날짜 · 조회수 · 작성자(서버 마스킹 그대로)
    expect(container.textContent).toContain("2026. 6. 1.");
    expect(container.textContent).toContain("142");
    expect(container.textContent).toContain("홍길동");
    // 태그 클릭 필터
    expect(screen.getByRole("link", { name: "행사" }).getAttribute("href")).toBe(
      "/notices?tagId=3",
    );
    // 마크다운 본문
    expect(container.querySelector(".prose-church")?.textContent).toContain("수련회 일정입니다");
    // 고정 아님 → "고정" 배지 없음
    expect(screen.queryByText("고정")).toBeNull();
  });

  it("isPinned면 고정 배지 표시", async () => {
    getNotice.mockResolvedValueOnce({ ...base, isPinned: true });
    render(await NoticeDetailPage({ params: Promise.resolve({ id: "5" }) }));
    expect(screen.getByText("고정")).toBeDefined();
  });

  it("author 없으면 메타에서 생략", async () => {
    getNotice.mockResolvedValueOnce({ ...base, author: null });
    const { container } = render(
      await NoticeDetailPage({ params: Promise.resolve({ id: "5" }) }),
    );
    expect(container.textContent).toContain("142");
    expect(container.textContent).not.toContain("홍길동");
  });

  it("없는 공지(null)면 notFound", async () => {
    getNotice.mockResolvedValueOnce(null);
    await expect(
      NoticeDetailPage({ params: Promise.resolve({ id: "99" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("비숫자·0·음수 id면 notFound(fetch 미호출)", async () => {
    await expect(
      NoticeDetailPage({ params: Promise.resolve({ id: "abc" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      NoticeDetailPage({ params: Promise.resolve({ id: "0" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      NoticeDetailPage({ params: Promise.resolve({ id: "-3" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getNotice).not.toHaveBeenCalled();
  });
});
