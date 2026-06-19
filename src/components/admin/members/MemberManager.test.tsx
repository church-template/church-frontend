// src/components/admin/members/MemberManager.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { listMock, pushMock, searchParamsRef } = vi.hoisted(() => ({ listMock: vi.fn(), pushMock: vi.fn(), searchParamsRef: { current: new URLSearchParams("") } }));
vi.mock("@/lib/api/members.admin", () => ({ listMembers: listMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/mypage/manage/members",
  useSearchParams: () => searchParamsRef.current,
}));
vi.mock("./AgreementResetPanel", () => ({ AgreementResetPanel: () => <div>agreement-panel</div> }));
vi.mock("./MemberDetailDialog", () => ({ MemberDetailDialog: ({ uuid }: { uuid: string | null }) => <div>detail:{uuid ?? "none"}</div> }));

import { MemberManager } from "./MemberManager";

const page = (content: unknown[], totalPages = 1) => ({ content, page: { size: 20, number: 0, totalElements: content.length, totalPages } });
const card = { uuid: "u1", name: "홍길동", phone: "010-1234-5678", position: "성도", roles: ["MEMBER"], approved: true, createdAt: "2026-01-01T00:00:00" };

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  searchParamsRef.current = new URLSearchParams("");
});
afterEach(() => vi.clearAllMocks());
const renderManager = () => render(<QueryClientProvider client={qc}><MemberManager /></QueryClientProvider>);

describe("MemberManager", () => {
  it("목록(이름·승인 Badge)을 렌더하고 약관 패널을 포함한다", async () => {
    listMock.mockResolvedValue(page([card]));
    renderManager();
    await waitFor(() => expect(screen.getByText("홍길동")).toBeDefined());
    // "승인"은 th 헤더 + Badge 두 곳에 렌더됨 — exactly 2개여야 함 (header + badge)
    expect(screen.getAllByText("승인").length).toBe(2);
    expect(screen.getByText("agreement-panel")).toBeDefined();
  });
  it("검색 제출 시 ?q= 로 URL을 갱신한다(page 리셋)", async () => {
    listMock.mockResolvedValue(page([card]));
    renderManager();
    await waitFor(() => expect(screen.getByText("홍길동")).toBeDefined());
    // ASCII 검색어로 URL 인코딩을 결정적으로 — 한글은 퍼센트 인코딩이라 어서션이 깨지기 쉽다.
    fireEvent.change(screen.getByLabelText("이름 또는 전화번호 검색"), { target: { value: "01012" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    expect(pushMock).toHaveBeenCalledWith("/mypage/manage/members?q=01012");
  });
  it("상세 액션 클릭 시 다이얼로그에 uuid를 전달한다", async () => {
    listMock.mockResolvedValue(page([card]));
    renderManager();
    await waitFor(() => expect(screen.getByText("홍길동")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "홍길동 상세" }));
    await waitFor(() => expect(screen.getByText("detail:u1")).toBeDefined());
  });
  it("빈 목록 안내", async () => {
    listMock.mockResolvedValue(page([]));
    renderManager();
    await waitFor(() => expect(screen.getByText("조회된 회원이 없습니다.")).toBeDefined());
  });
});
