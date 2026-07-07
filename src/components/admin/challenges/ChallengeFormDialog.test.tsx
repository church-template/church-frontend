import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { createMock, patchMock, fetchChallengeMock } = vi.hoisted(() => ({
  createMock: vi.fn(), patchMock: vi.fn(), fetchChallengeMock: vi.fn(),
}));
vi.mock("@/lib/api/challenges.admin", () => ({ createChallenge: createMock, patchChallenge: patchMock }));
vi.mock("@/lib/api/challenges", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchChallenge: fetchChallengeMock,
}));
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn() } }));
// MarkdownEditor는 별도 테스트 대상 — value/onChange를 그대로 전달하는 textarea로 대체(테스트 관례).
vi.mock("@/components/admin/MarkdownEditor", () => ({
  MarkdownEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="소개" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

import { ChallengeFormDialog } from "./ChallengeFormDialog";
import { ApiError } from "@/lib/auth/apiError";

let qc: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
const renderDialog = (props: Partial<Parameters<typeof ChallengeFormDialog>[0]> = {}) =>
  render(
    <QueryClientProvider client={qc}>
      <ChallengeFormDialog open onOpenChange={vi.fn()} mode="create" {...props} />
    </QueryClientProvider>,
  );

describe("ChallengeFormDialog", () => {
  it("신약 프리셋 클릭 → 범위 40~66 + 미리보기(총 260장)", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "신약" }));
    expect((screen.getByLabelText("시작 권") as HTMLSelectElement).value).toBe("40");
    expect((screen.getByLabelText("끝 권") as HTMLSelectElement).value).toBe("66");
    fireEvent.change(screen.getByLabelText("목표 일수"), { target: { value: "65" } });
    expect(await screen.findByText(/총 260장 · 하루 4장/)).toBeDefined();
  });

  it("생성 제출: createChallenge 호출(빈 소개 생략)", async () => {
    createMock.mockResolvedValue({ id: 1 });
    renderDialog();
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "2026 신약 통독" } });
    fireEvent.click(screen.getByRole("button", { name: "신약" }));
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-01-05" } });
    fireEvent.change(screen.getByLabelText("목표 일수"), { target: { value: "65" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(createMock).toHaveBeenCalledWith({
      title: "2026 신약 통독", startBook: 40, endBook: 66, startDate: "2026-01-05", targetDays: 65,
    }));
  });

  it("시작 권 > 끝 권이면 검증 에러", async () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "T" } });
    fireEvent.change(screen.getByLabelText("시작 권"), { target: { value: "40" } });
    fireEvent.change(screen.getByLabelText("끝 권"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-01-05" } });
    fireEvent.change(screen.getByLabelText("목표 일수"), { target: { value: "65" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("끝 권은 시작 권보다 앞설 수 없습니다.")).toBeDefined();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("edit: fresh 상세로 시드 후 PATCH(dirty 필드만 + version)", async () => {
    fetchChallengeMock.mockResolvedValue({
      id: 5, title: "기존", startBook: 1, endBook: 66, startDate: "2026-01-05", endDate: "2027-01-03",
      targetDays: 365, totalChapters: 1189, dailyGoal: 4, status: "ONGOING", joined: false, version: 2, description: "",
    });
    patchMock.mockResolvedValue({ id: 5 });
    renderDialog({ mode: "edit", editId: 5 });
    await waitFor(() => expect((screen.getByLabelText("제목") as HTMLInputElement).value).toBe("기존"));
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "수정됨" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(patchMock.mock.calls[0][0]).toBe(5);
    // 제목만 변경 — 구간·기간 필드는 부재해야 참여자 있는 챌린지도 수정 가능(스펙 §7 회귀 방지).
    expect(patchMock.mock.calls[0][1]).toEqual({ title: "수정됨", version: 2 });
  });

  it("edit: 프리셋으로 범위 변경 → dirty로 잡혀 PATCH body에 포함", async () => {
    fetchChallengeMock.mockResolvedValue({
      id: 5, title: "기존", startBook: 1, endBook: 39, startDate: "2026-01-05", endDate: "2027-01-03",
      targetDays: 365, totalChapters: 1189, dailyGoal: 4, status: "ONGOING", joined: false, version: 2, description: "",
    });
    patchMock.mockResolvedValue({ id: 5 });
    renderDialog({ mode: "edit", editId: 5 });
    await waitFor(() => expect((screen.getByLabelText("제목") as HTMLInputElement).value).toBe("기존"));
    fireEvent.click(screen.getByRole("button", { name: "신약" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(patchMock.mock.calls[0][1]).toMatchObject({ startBook: 40, endBook: 66 });
  });

  it("edit: 소개를 비우면 PATCH body에 description: \"\" 포함(삭제 허용)", async () => {
    fetchChallengeMock.mockResolvedValue({
      id: 5, title: "기존", startBook: 1, endBook: 66, startDate: "2026-01-05", endDate: "2027-01-03",
      targetDays: 365, totalChapters: 1189, dailyGoal: 4, status: "ONGOING", joined: false, version: 2, description: "기존 소개",
    });
    patchMock.mockResolvedValue({ id: 5 });
    renderDialog({ mode: "edit", editId: 5 });
    await waitFor(() => expect((screen.getByLabelText("소개") as HTMLTextAreaElement).value).toBe("기존 소개"));
    fireEvent.change(screen.getByLabelText("소개"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(patchMock.mock.calls[0][1]).toMatchObject({ description: "" });
  });

  it("400 INVALID_INPUT_VALUE detail은 폼 상단 배너로", async () => {
    fetchChallengeMock.mockResolvedValue({
      id: 5, title: "기존", startBook: 1, endBook: 66, startDate: "2026-01-05", endDate: "2027-01-03",
      targetDays: 365, totalChapters: 1189, dailyGoal: 4, status: "ONGOING", joined: false, version: 2, description: "",
    });
    patchMock.mockRejectedValue(new ApiError(400, "INVALID_INPUT_VALUE", "참여자가 있어 범위·기간은 수정할 수 없습니다."));
    renderDialog({ mode: "edit", editId: 5 });
    await waitFor(() => expect((screen.getByLabelText("제목") as HTMLInputElement).value).toBe("기존"));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("참여자가 있어 범위·기간은 수정할 수 없습니다.")).toBeDefined();
  });
});
