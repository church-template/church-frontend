import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/auth/apiError";
import { SERMON_DEFAULT_PREACHER } from "@/constants/church";
import { todayKstDate } from "@/lib/date";

const { createSermonMock, updateSermonMock, pushMock, refreshMock, notifySuccess } = vi.hoisted(() => ({
  createSermonMock: vi.fn(),
  updateSermonMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("@/lib/api/sermons.admin", () => ({ createSermon: createSermonMock, updateSermon: updateSermonMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, refresh: refreshMock }) }));
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess, error: vi.fn() } }));
// 태그 옵션 fetch는 폼 테스트 범위 밖 — 빈 배열로 고정
vi.mock("@/lib/api/tags", () => ({ getTags: vi.fn().mockResolvedValue([]) }));

import { SermonForm } from "./SermonForm";

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => vi.clearAllMocks());
function renderForm(ui: React.ReactNode) {
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

// 수정 모드 시드 — 프리필 테스트와 version 테스트가 공유.
const EDIT_INITIAL = {
  id: 9, title: "원본", preacher: "김목사", series: null, scripture: null,
  content: "", videoUrl: null, audioUrl: null, preachedAt: "2026-06-01",
  viewCount: 0, createdAt: "2026-06-01T00:00:00", updatedAt: "2026-06-01T00:00:00",
  version: 4, tags: [], author: null,
};

describe("SermonForm", () => {
  it("필수 누락 시 검증 메시지를 보이고 제출하지 않는다", async () => {
    renderForm(<SermonForm mode="create" />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("제목을 입력해 주세요.")).toBeDefined());
    expect(createSermonMock).not.toHaveBeenCalled();
  });

  it("등록 성공 시 쿼리 무효화 후 상세로 이동한다", async () => {
    createSermonMock.mockResolvedValue({ id: 9 });
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    renderForm(<SermonForm mode="create" />);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "주일설교" } });
    fireEvent.change(screen.getByLabelText("설교자"), { target: { value: "김목사" } });
    fireEvent.change(screen.getByLabelText("설교일"), { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(createSermonMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "주일설교", preacher: "김목사", preachedAt: "2026-06-01" }),
      ),
    );
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sermons"] }));
    expect(pushMock).toHaveBeenCalledWith("/sermons/9");
    expect(notifySuccess).toHaveBeenCalled();
  });

  it("수정 모드는 initial.version을 PUT body에 포함하고 상세 쿼리도 무효화한다", async () => {
    updateSermonMock.mockResolvedValue({ id: 9 });
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    renderForm(<SermonForm mode="edit" initial={EDIT_INITIAL} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(updateSermonMock).toHaveBeenCalledWith(9, expect.objectContaining({ version: 4 })),
    );
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sermon", 9] }));
  });

  it("서버 필드 에러를 해당 입력에 매핑한다", async () => {
    createSermonMock.mockRejectedValue(
      new ApiError(400, "INVALID_INPUT_VALUE", undefined, undefined, undefined, [
        { field: "title", reason: "이미 존재하는 제목입니다." },
      ]),
    );
    renderForm(<SermonForm mode="create" />);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "주일설교" } });
    fireEvent.change(screen.getByLabelText("설교자"), { target: { value: "김목사" } });
    fireEvent.change(screen.getByLabelText("설교일"), { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.getByText("이미 존재하는 제목입니다.")).toBeDefined());
  });

  it("create 모드는 설교자·설교일이 미리 채워진다(교회 상수·오늘 KST)", () => {
    renderForm(<SermonForm mode="create" />);
    expect((screen.getByLabelText("설교자") as HTMLInputElement).value).toBe(
      SERMON_DEFAULT_PREACHER,
    );
    const date = screen.getByLabelText("설교일") as HTMLInputElement;
    expect(date.value).toBe(todayKstDate());
    // max가 연도 세그먼트를 4자리로 제한(6자리 연도 입력·자동 이동 안 됨 문제의 해결 장치)
    expect(date.getAttribute("max")).toBe("9999-12-31");
  });

  it("edit 모드는 프리필 대신 initial 값을 유지한다", () => {
    renderForm(<SermonForm mode="edit" initial={EDIT_INITIAL} />);
    expect((screen.getByLabelText("설교자") as HTMLInputElement).value).toBe("김목사");
    expect((screen.getByLabelText("설교일") as HTMLInputElement).value).toBe("2026-06-01");
  });
});
