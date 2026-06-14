// src/app/(site)/sermons/[id]/edit/page.test.tsx
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
vi.mock("@/components/admin/RequirePermission", () => ({
  RequirePermission: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/admin/EditGate", () => ({
  EditAccessDenied: () => <div data-testid="access-denied" />,
}));
vi.mock("@/components/sermons/SermonForm", () => ({
  SermonForm: ({ mode, initial }: { mode: string; initial?: unknown }) => (
    <div data-testid="sermon-form" data-mode={mode} data-id={(initial as { id?: number } | undefined)?.id} />
  ),
}));

import SermonEditPage from "./page";

afterEach(() => vi.clearAllMocks());

const base = {
  id: 7, title: "은혜의 강가에서", preacher: "김목사", series: "여름",
  scripture: "요 4:1-14", content: "# 제목\n말씀입니다", videoUrl: null, audioUrl: null,
  preachedAt: "2026-06-08", viewCount: 1240, createdAt: "2026-06-08T00:00:00",
  updatedAt: "2026-06-08T00:00:00", version: 0, tags: [{ id: 3, name: "주일설교" }],
  author: "홍길동",
};

describe("SermonEditPage (수정)", () => {
  it("유효한 id면 getSermon 호출 후 SermonForm(edit 모드) 렌더", async () => {
    getSermon.mockResolvedValueOnce(base);
    render(await SermonEditPage({ params: Promise.resolve({ id: "7" }) }));
    expect(getSermon).toHaveBeenCalledWith(7);
    const form = screen.getByTestId("sermon-form");
    expect(form.getAttribute("data-mode")).toBe("edit");
    expect(form.getAttribute("data-id")).toBe("7");
  });

  it("없는 설교(null)면 notFound", async () => {
    getSermon.mockResolvedValueOnce(null);
    await expect(
      SermonEditPage({ params: Promise.resolve({ id: "99" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("비숫자 id면 notFound(fetch 미호출)", async () => {
    await expect(
      SermonEditPage({ params: Promise.resolve({ id: "abc" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getSermon).not.toHaveBeenCalled();
  });

  it("id가 0·음수면 notFound(fetch 미호출)", async () => {
    await expect(
      SermonEditPage({ params: Promise.resolve({ id: "0" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      SermonEditPage({ params: Promise.resolve({ id: "-3" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getSermon).not.toHaveBeenCalled();
  });
});
