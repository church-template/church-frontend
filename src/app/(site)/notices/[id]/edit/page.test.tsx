// src/app/(site)/notices/[id]/edit/page.test.tsx
// sermons/[id]/edit/page.test.tsx 패턴을 미러링 — 가드 동작(notFound·fetch 미호출·mode='edit' 전달) 검증
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
vi.mock("@/components/admin/RequirePermission", () => ({
  RequirePermission: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/admin/EditGate", () => ({
  EditAccessDenied: () => <div data-testid="access-denied" />,
}));
vi.mock("@/components/notices/NoticeForm", () => ({
  NoticeForm: ({ mode, initial }: { mode: string; initial?: unknown }) => (
    <div data-testid="notice-form" data-mode={mode} data-id={(initial as { id?: number } | undefined)?.id} />
  ),
}));

import NoticeEditPage from "./page";

afterEach(() => vi.clearAllMocks());

const base = {
  id: 5, title: "2026 여름 수련회 안내", content: "# 안내\n수련회 일정입니다",
  isPinned: false, viewCount: 142, createdAt: "2026-06-01T09:00:00",
  updatedAt: "2026-06-01T09:00:00", version: 0,
  tags: [{ id: 3, name: "행사" }], author: "홍길동",
};

describe("NoticeEditPage (수정)", () => {
  it("유효한 id면 getNotice 호출 후 NoticeForm(edit 모드) 렌더", async () => {
    getNotice.mockResolvedValueOnce(base);
    render(await NoticeEditPage({ params: Promise.resolve({ id: "5" }) }));
    expect(getNotice).toHaveBeenCalledWith(5);
    const form = screen.getByTestId("notice-form");
    expect(form.getAttribute("data-mode")).toBe("edit");
    expect(form.getAttribute("data-id")).toBe("5");
  });

  it("없는 공지(null)면 notFound", async () => {
    getNotice.mockResolvedValueOnce(null);
    await expect(
      NoticeEditPage({ params: Promise.resolve({ id: "99" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("비숫자 id면 notFound(fetch 미호출)", async () => {
    await expect(
      NoticeEditPage({ params: Promise.resolve({ id: "abc" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getNotice).not.toHaveBeenCalled();
  });

  it("id가 0·음수면 notFound(fetch 미호출)", async () => {
    await expect(
      NoticeEditPage({ params: Promise.resolve({ id: "0" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      NoticeEditPage({ params: Promise.resolve({ id: "-3" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getNotice).not.toHaveBeenCalled();
  });
});
