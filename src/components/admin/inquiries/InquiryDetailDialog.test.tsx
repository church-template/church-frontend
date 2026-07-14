import { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getMock, completeMock, deleteMock, notifySuccess } = vi.hoisted(() => ({
  getMock: vi.fn(),
  completeMock: vi.fn(),
  deleteMock: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/inquiries.admin", () => ({
  getInquiry: getMock,
  completeInquiry: completeMock,
  deleteInquiry: deleteMock,
}));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));

import { InquiryDetailDialog } from "./InquiryDetailDialog";

const detail = {
  id: 7,
  name: "홍길동",
  phone: "010-1234-5678",
  email: "a@b.com",
  content: "예배 시간이 궁금합니다.",
  completed: false,
  completedAt: null,
  createdAt: "2026-07-14T10:00:00",
};

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => vi.clearAllMocks());

const renderDialog = (id: number | null = 7) =>
  render(
    <QueryClientProvider client={qc}>
      <InquiryDetailDialog id={id} open onOpenChange={() => {}} />
    </QueryClientProvider>,
  );

describe("InquiryDetailDialog", () => {
  it("문의 내용과 연락처를 렌더한다", async () => {
    getMock.mockResolvedValue(detail);
    renderDialog();
    await waitFor(() => expect(screen.getByText("예배 시간이 궁금합니다.")).toBeDefined());
    expect(screen.getByText("010-1234-5678")).toBeDefined();
    expect(screen.getByText("a@b.com")).toBeDefined();
    expect(screen.getByText("미처리")).toBeDefined();
  });

  it("'완료 처리'를 누르면 completeInquiry(id, true)를 호출한다", async () => {
    getMock.mockResolvedValue(detail);
    completeMock.mockResolvedValue({ ...detail, completed: true, completedAt: "2026-07-14T11:00:00" });
    renderDialog();
    await waitFor(() => expect(screen.getByRole("button", { name: "완료 처리" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "완료 처리" }));

    await waitFor(() => expect(completeMock).toHaveBeenCalledWith(7, true));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalled());
  });

  it("완료된 문의는 '완료 취소'를 노출하고 completeInquiry(id, false)를 호출한다", async () => {
    getMock.mockResolvedValue({ ...detail, completed: true, completedAt: "2026-07-14T11:00:00" });
    completeMock.mockResolvedValue({ ...detail, completed: false, completedAt: null });
    renderDialog();
    await waitFor(() => expect(screen.getByRole("button", { name: "완료 취소" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "완료 취소" }));

    await waitFor(() => expect(completeMock).toHaveBeenCalledWith(7, false));
  });

  it("삭제는 확인 다이얼로그를 거쳐 deleteInquiry를 호출한다", async () => {
    getMock.mockResolvedValue(detail);
    deleteMock.mockResolvedValue(undefined);
    renderDialog();
    await waitFor(() => expect(screen.getByRole("button", { name: "삭제" })).toBeDefined());

    // 1차: 상세의 삭제 버튼 → 확인 다이얼로그 오픈
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(screen.getByText("문의를 삭제할까요?")).toBeDefined());

    // 2차: 확인 다이얼로그의 삭제 버튼(마지막으로 렌더된 것)
    const confirmButtons = screen.getAllByRole("button", { name: "삭제" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(7));
  });

  it("삭제 성공 후 삭제된 상세를 재조회하지 않는다", async () => {
    // renderDialog의 onOpenChange={() => {}}는 open을 고정해 실제 닫힘을 재현하지 못한다.
    // 리뷰 지적(invalidateQueries가 open===true인 채 동기 실행돼 삭제된 상세를 재조회)을 잡으려면
    // 실제 소비 패턴대로 open이 false로 바뀌는 부모 래퍼가 필요하다.
    function Wrapper() {
      const [open, setOpen] = useState(true);
      return <InquiryDetailDialog id={7} open={open} onOpenChange={setOpen} />;
    }

    getMock.mockResolvedValue(detail);
    deleteMock.mockResolvedValue(undefined);
    render(
      <QueryClientProvider client={qc}>
        <Wrapper />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "삭제" })).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(screen.getByText("문의를 삭제할까요?")).toBeDefined());

    const confirmButtons = screen.getAllByRole("button", { name: "삭제" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith("삭제했습니다."));
    const callsAfterDelete = getMock.mock.calls.length;
    expect(callsAfterDelete).toBe(1);
    // 리렌더·이펙트가 뒤늦게 재조회를 트리거하지 않는지 한 번 더 확인.
    await new Promise((r) => setTimeout(r, 50));
    expect(getMock.mock.calls.length).toBe(callsAfterDelete);
  });
});
