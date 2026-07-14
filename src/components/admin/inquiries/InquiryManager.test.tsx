import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { listMock, pushMock, searchParamsRef } = vi.hoisted(() => ({
  listMock: vi.fn(),
  pushMock: vi.fn(),
  searchParamsRef: { current: new URLSearchParams("") },
}));
vi.mock("@/lib/api/inquiries.admin", () => ({ listInquiries: listMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/mypage/manage/inquiries",
  useSearchParams: () => searchParamsRef.current,
}));
vi.mock("./InquiryDetailDialog", () => ({
  InquiryDetailDialog: ({ id }: { id: number | null }) => <div>detail:{id ?? "none"}</div>,
}));

import { InquiryManager } from "./InquiryManager";

const card = {
  id: 7,
  name: "홍길동",
  phone: "010-1234-5678",
  email: "a@b.com",
  completed: false,
  completedAt: null,
  createdAt: "2026-07-14T10:00:00",
};
const page = (content: unknown[], totalPages = 1) => ({
  content,
  page: { size: 10, number: 0, totalElements: content.length, totalPages },
});

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  searchParamsRef.current = new URLSearchParams("");
});
afterEach(() => vi.clearAllMocks());
const renderManager = () =>
  render(
    <QueryClientProvider client={qc}>
      <InquiryManager />
    </QueryClientProvider>,
  );

describe("InquiryManager", () => {
  it("목록(이름·연락처·상태 Badge)을 렌더한다", async () => {
    listMock.mockResolvedValue(page([card]));
    renderManager();
    await waitFor(() => expect(screen.getByText("홍길동")).toBeDefined());
    expect(screen.getByText("010-1234-5678")).toBeDefined();
    // "미처리"는 탭 라벨 + Badge 두 곳에 렌더됨 — exactly 2개여야 함 (MemberManager "승인" 선례)
    expect(screen.getAllByText("미처리").length).toBe(2);
  });

  it("기본(전체) 진입 시 completed 없이 조회한다", async () => {
    listMock.mockResolvedValue(page([card]));
    renderManager();
    await waitFor(() => expect(listMock).toHaveBeenCalledWith({ completed: undefined, page: 0, size: 10 }));
  });

  it("'미처리' 탭을 누르면 ?completed=false 로 URL을 갱신한다", async () => {
    listMock.mockResolvedValue(page([card]));
    renderManager();
    await waitFor(() => expect(screen.getByText("홍길동")).toBeDefined());

    fireEvent.mouseDown(screen.getByRole("tab", { name: "미처리" })); // Radix Tabs는 jsdom에서 click 미동작(MarkdownEditor.test.tsx 선례)

    expect(pushMock).toHaveBeenCalledWith("/mypage/manage/inquiries?completed=false");
  });

  it("URL에 completed=true가 있으면 완료만 조회한다", async () => {
    searchParamsRef.current = new URLSearchParams("completed=true");
    listMock.mockResolvedValue(page([{ ...card, completed: true, completedAt: "2026-07-14T11:00:00" }]));
    renderManager();
    await waitFor(() => expect(listMock).toHaveBeenCalledWith({ completed: true, page: 0, size: 10 }));
    // "완료"도 탭 라벨 + Badge 두 곳에 렌더됨 — exactly 2개
    await waitFor(() => expect(screen.getAllByText("완료").length).toBe(2));
  });

  it("행을 클릭하면 상세 다이얼로그에 id를 넘긴다", async () => {
    listMock.mockResolvedValue(page([card]));
    renderManager();
    await waitFor(() => expect(screen.getByText("홍길동")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "홍길동 문의 상세" }));

    await waitFor(() => expect(screen.getByText("detail:7")).toBeDefined());
  });

  it("빈 목록이면 안내를 렌더한다", async () => {
    listMock.mockResolvedValue(page([]));
    renderManager();
    await waitFor(() => expect(screen.getByText("접수된 문의가 없습니다.")).toBeDefined());
  });
});
