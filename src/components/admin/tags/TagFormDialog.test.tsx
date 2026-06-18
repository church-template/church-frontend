import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/auth/apiError";

const { createMock, patchMock, notifySuccess, revalidateTagsMock } = vi.hoisted(() => ({
  createMock: vi.fn(), patchMock: vi.fn(), notifySuccess: vi.fn(), revalidateTagsMock: vi.fn(),
}));
vi.mock("@/lib/api/tags.admin", () => ({ createTag: createMock, patchTag: patchMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateTags: revalidateTagsMock }));

import { TagFormDialog } from "./TagFormDialog";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); revalidateTagsMock.mockResolvedValue(undefined); });
afterEach(() => vi.clearAllMocks());
const renderDialog = (ui: React.ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

describe("TagFormDialog", () => {
  it("등록: 이름 입력 후 저장하면 createTag 호출·닫힘", async () => {
    createMock.mockResolvedValue({ id: 1, name: "주일설교" });
    const onOpenChange = vi.fn();
    renderDialog(<TagFormDialog open mode="create" onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "주일설교" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createMock).toHaveBeenCalledWith({ name: "주일설교" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith("저장했습니다."));
  });

  it("빈 이름은 검증 실패로 createTag 미호출", async () => {
    renderDialog(<TagFormDialog open mode="create" onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("이름을 입력해 주세요.")).toBeDefined());
    expect(createMock).not.toHaveBeenCalled();
  });

  it("수정: initial.id로 patchTag 호출", async () => {
    patchMock.mockResolvedValue({ id: 7, name: "수정됨" });
    const onOpenChange = vi.fn();
    renderDialog(<TagFormDialog open mode="edit" initial={{ id: 7, name: "원본" }} onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "수정됨" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(patchMock).toHaveBeenCalledWith(7, { name: "수정됨" }));
    await waitFor(() => expect(revalidateTagsMock).toHaveBeenCalled());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("중복(409 DUPLICATE_RESOURCE)이면 name 인라인 에러·다이얼로그 유지", async () => {
    createMock.mockRejectedValue(new ApiError(409, "DUPLICATE_RESOURCE", "이미 존재"));
    const onOpenChange = vi.fn();
    renderDialog(<TagFormDialog open mode="create" onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "중복" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("같은 이름이 이미 있습니다.")).toBeDefined());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
