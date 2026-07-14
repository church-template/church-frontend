import { describe, it, expect, vi, afterEach } from "vitest";

const { authFetchMock, apiMutateMock } = vi.hoisted(() => ({ authFetchMock: vi.fn(), apiMutateMock: vi.fn() }));
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { listInquiries, getInquiry, completeInquiry, deleteInquiry } from "./inquiries.admin";

afterEach(() => vi.clearAllMocks());

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

const card = {
  id: 1,
  name: "홍길동",
  phone: "010-1234-5678",
  email: "a@b.com",
  completed: false,
  completedAt: null,
  createdAt: "2026-07-14T10:00:00",
};

describe("문의 어드민 API", () => {
  it("listInquiries는 completed 미지정 시 쿼리에서 생략한다", async () => {
    authFetchMock.mockResolvedValue(ok({ content: [card], page: { size: 10, number: 0, totalElements: 1, totalPages: 1 } }));
    const res = await listInquiries({ page: 0, size: 10 });
    expect(res.content[0].name).toBe("홍길동");
    const [url] = authFetchMock.mock.calls[0];
    expect(String(url).endsWith("/api/admin/inquiries?page=0&size=10")).toBe(true);
  });

  it("listInquiries는 completed=false를 쿼리에 반영한다(미처리만)", async () => {
    authFetchMock.mockResolvedValue(ok({ content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } }));
    await listInquiries({ completed: false, page: 0, size: 10 });
    const [url] = authFetchMock.mock.calls[0];
    expect(String(url).endsWith("/api/admin/inquiries?completed=false&page=0&size=10")).toBe(true);
  });

  it("listInquiries는 completed=true를 쿼리에 반영한다(완료만)", async () => {
    authFetchMock.mockResolvedValue(ok({ content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } }));
    await listInquiries({ completed: true, page: 1, size: 10 });
    const [url] = authFetchMock.mock.calls[0];
    expect(String(url).endsWith("/api/admin/inquiries?completed=true&page=1&size=10")).toBe(true);
  });

  it("getInquiry는 상세를 조회한다(content 포함)", async () => {
    authFetchMock.mockResolvedValue(ok({ ...card, content: "문의 내용입니다." }));
    const res = await getInquiry(1);
    expect(res.content).toBe("문의 내용입니다.");
    const [url] = authFetchMock.mock.calls[0];
    expect(String(url).endsWith("/api/admin/inquiries/1")).toBe(true);
  });

  it("completeInquiry는 PATCH로 completed를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ ...card, content: "x", completed: true, completedAt: "2026-07-14T11:00:00" });
    await completeInquiry(1, true);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/inquiries/1/complete", {
      method: "PATCH",
      body: { completed: true },
    });
  });

  it("completeInquiry는 완료 취소(false)도 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ ...card, content: "x" });
    await completeInquiry(2, false);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/inquiries/2/complete", {
      method: "PATCH",
      body: { completed: false },
    });
  });

  it("deleteInquiry는 DELETE를 호출한다", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteInquiry(3);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/inquiries/3", { method: "DELETE" });
  });
});
