// src/components/bulletins/BulletinAdminActions.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { deleteMock, refreshMock, notifySuccess, revalidateMock } = vi.hoisted(() => ({
  deleteMock: vi.fn(), refreshMock: vi.fn(), notifySuccess: vi.fn(), revalidateMock: vi.fn(),
}));
vi.mock("@/lib/api/bulletins.admin", () => ({ deleteBulletin: deleteMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock, push: vi.fn() }) }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateBulletins: revalidateMock }));
// 권한 게이트는 통과로 고정(useMe 미목 시 children 미렌더 방지)
vi.mock("@/components/admin/RequirePermission", () => ({ RequirePermission: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
// FormDialog는 별도 테스트 — 무력화
vi.mock("./BulletinFormDialog", () => ({ BulletinFormDialog: () => null }));

import { BulletinRowActions } from "./BulletinAdminActions";

afterEach(() => vi.clearAllMocks());
const renderQc = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

describe("BulletinRowActions", () => {
  it("삭제 확인 시 deleteBulletin 호출·revalidate", async () => {
    deleteMock.mockResolvedValue(undefined);
    renderQc(<BulletinRowActions b={{ id: 7, title: "주보", serviceDate: "2026-06-07", mediaId: 1, createdAt: "2026-06-07T00:00:00" }} />);
    fireEvent.click(screen.getByRole("button", { name: "주보 삭제" })); // 트리거(aria-label)
    fireEvent.click(screen.getByRole("button", { name: "삭제" })); // 확인 다이얼로그의 확정(기본 라벨)
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(7));
    await waitFor(() => expect(revalidateMock).toHaveBeenCalled());
  });
});
