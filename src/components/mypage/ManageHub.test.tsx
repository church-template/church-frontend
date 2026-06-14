import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ManageHub } from "./ManageHub";

vi.mock("@/components/main/Reveal", () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/auth/useMe", () => ({ useMe: vi.fn() }));
import { useMe } from "@/lib/auth/useMe";

const mockMe = (perms: string[] | null, isLoading = false) =>
  (useMe as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    data: perms ? { permissions: perms } : undefined,
    isLoading,
  });

beforeEach(() => vi.clearAllMocks());

describe("ManageHub", () => {
  it("보유 권한 도메인 카드만 노출한다", () => {
    mockMe(["SERMON_WRITE"]);
    render(<ManageHub />);
    expect(screen.queryByText("설교 관리")).not.toBeNull();
    expect(screen.queryByText("공지 관리")).toBeNull();
    expect(screen.queryByText("역할·권한 관리")).toBeNull();
  });

  it("관리 권한이 하나도 없으면 섹션 자체를 렌더하지 않는다", () => {
    mockMe(["GALLERY_VIEW"]);
    const { container } = render(<ManageHub />);
    expect(container.querySelector("section")).toBeNull();
  });

  it("로딩 중이면 렌더하지 않는다", () => {
    mockMe(null, true);
    const { container } = render(<ManageHub />);
    expect(container.querySelector("section")).toBeNull();
  });
});
