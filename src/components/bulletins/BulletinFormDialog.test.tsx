// src/components/bulletins/BulletinFormDialog.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { createMock, patchMock, getMock, refreshMock, notifySuccess, revalidateMock } = vi.hoisted(() => ({
  createMock: vi.fn(), patchMock: vi.fn(), getMock: vi.fn(), refreshMock: vi.fn(), notifySuccess: vi.fn(), revalidateMock: vi.fn(),
}));
vi.mock("@/lib/api/bulletins.admin", () => ({ createBulletin: createMock, patchBulletin: patchMock }));
vi.mock("@/lib/api/bulletins", () => ({ getBulletin: getMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock, push: vi.fn() }) }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateBulletins: revalidateMock }));
// MediaPicker는 별도 테스트 — mediaId를 즉시 올리는 가짜로 대체
vi.mock("@/components/admin/MediaPicker", () => ({
  MediaPicker: ({ open, onConfirm }: { open: boolean; onConfirm: (ids: number[]) => void }) =>
    open ? <button type="button" onClick={() => onConfirm([9])}>__pick</button> : null,
}));

import { BulletinFormDialog } from "./BulletinFormDialog";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
const renderDialog = (ui: React.ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

describe("BulletinFormDialog", () => {
  it("등록: 제목·예배일·PDF 선택 후 저장하면 createBulletin 호출", async () => {
    createMock.mockResolvedValue({ id: 1 });
    const onOpenChange = vi.fn();
    renderDialog(<BulletinFormDialog open mode="create" onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "6월 첫째주" } });
    fireEvent.change(screen.getByLabelText("예배일"), { target: { value: "2026-06-07" } });
    fireEvent.click(screen.getByRole("button", { name: "PDF 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "__pick" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith({ title: "6월 첫째주", serviceDate: "2026-06-07", mediaId: 9 }),
    );
    await waitFor(() => expect(revalidateMock).toHaveBeenCalled());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("PDF 미선택 시 검증 에러를 보이고 제출하지 않는다", async () => {
    renderDialog(<BulletinFormDialog open mode="create" onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("예배일"), { target: { value: "2026-06-07" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("PDF 파일을 선택해 주세요.")).toBeDefined());
    expect(createMock).not.toHaveBeenCalled();
  });
});
