import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RequirePermission } from "./RequirePermission";

vi.mock("@/lib/auth/useMe", () => ({ useMe: vi.fn() }));
import { useMe } from "@/lib/auth/useMe";

const mockMe = (over: Partial<{ data: unknown; isLoading: boolean }>) =>
  (useMe as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: undefined, isLoading: false, ...over });

beforeEach(() => vi.clearAllMocks());

describe("RequirePermission", () => {
  it("권한 보유 시 children 렌더", () => {
    mockMe({ data: { permissions: ["SERMON_WRITE"] } });
    render(<RequirePermission permission="SERMON_WRITE"><button>등록</button></RequirePermission>);
    expect(screen.queryByText("등록")).not.toBeNull();
  });

  it("권한 미보유 시 children 비렌더(fallback 기본 null)", () => {
    mockMe({ data: { permissions: ["GALLERY_VIEW"] } });
    render(<RequirePermission permission="SERMON_WRITE"><button>등록</button></RequirePermission>);
    expect(screen.queryByText("등록")).toBeNull();
  });

  it("로딩 중이면 비렌더(깜빡임 방지)", () => {
    mockMe({ data: undefined, isLoading: true });
    render(<RequirePermission permission="SERMON_WRITE"><button>등록</button></RequirePermission>);
    expect(screen.queryByText("등록")).toBeNull();
  });

  it("perms + mode=any: 하나라도 보유면 렌더", () => {
    mockMe({ data: { permissions: ["NOTICE_WRITE"] } });
    render(
      <RequirePermission perms={["SERMON_WRITE", "NOTICE_WRITE"]} mode="any">
        <button>액션</button>
      </RequirePermission>,
    );
    expect(screen.queryByText("액션")).not.toBeNull();
  });

  it("perms + mode=all: 전부 보유해야 렌더", () => {
    mockMe({ data: { permissions: ["NOTICE_WRITE"] } });
    render(
      <RequirePermission perms={["SERMON_WRITE", "NOTICE_WRITE"]} mode="all">
        <button>액션</button>
      </RequirePermission>,
    );
    expect(screen.queryByText("액션")).toBeNull();
  });

  it("미보유 시 fallback 렌더", () => {
    mockMe({ data: { permissions: [] } });
    render(
      <RequirePermission permission="SERMON_WRITE" fallback={<span>권한 없음</span>}>
        <button>등록</button>
      </RequirePermission>,
    );
    expect(screen.queryByText("권한 없음")).not.toBeNull();
  });
});
