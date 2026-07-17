import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getTagsMock } = vi.hoisted(() => ({ getTagsMock: vi.fn() }));
vi.mock("@/lib/api/tags", () => ({ getTags: getTagsMock }));

import { TagMultiSelect } from "./TagMultiSelect";

afterEach(() => vi.clearAllMocks());

function renderWithQc(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("TagMultiSelect", () => {
  it("태그 목록이 열기 단계 없이 즉시 칩 버튼으로 렌더된다", async () => {
    getTagsMock.mockResolvedValue([
      { id: 1, name: "청년부" },
      { id: 2, name: "주일예배" },
    ]);
    renderWithQc(<TagMultiSelect value={[]} onChange={() => {}} />);
    expect(await screen.findByRole("button", { name: "청년부" })).toBeDefined();
    expect(screen.getByRole("button", { name: "주일예배" })).toBeDefined();
  });

  it("비선택 칩 클릭 시 onChange가 기존 배열에 id를 더해 호출된다", async () => {
    getTagsMock.mockResolvedValue([
      { id: 1, name: "청년부" },
      { id: 2, name: "주일예배" },
    ]);
    const onChange = vi.fn();
    renderWithQc(<TagMultiSelect value={[2]} onChange={onChange} />);
    fireEvent.click(await screen.findByRole("button", { name: "청년부" }));
    expect(onChange).toHaveBeenCalledWith([2, 1]);
  });

  it("선택된 칩 클릭 시 onChange가 해당 id를 뺀 배열로 호출된다", async () => {
    getTagsMock.mockResolvedValue([
      { id: 1, name: "청년부" },
      { id: 2, name: "주일예배" },
    ]);
    const onChange = vi.fn();
    renderWithQc(<TagMultiSelect value={[1, 2]} onChange={onChange} />);
    fireEvent.click(await screen.findByRole("button", { name: "청년부" }));
    expect(onChange).toHaveBeenCalledWith([2]);
  });

  it("선택 여부가 aria-pressed로 반영된다", async () => {
    getTagsMock.mockResolvedValue([
      { id: 1, name: "청년부" },
      { id: 2, name: "주일예배" },
    ]);
    renderWithQc(<TagMultiSelect value={[1]} onChange={() => {}} />);
    const selected = await screen.findByRole("button", { name: "청년부" });
    expect(selected.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByRole("button", { name: "주일예배" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("로딩 중 문구를 보여준다", () => {
    getTagsMock.mockReturnValue(new Promise(() => {}));
    renderWithQc(<TagMultiSelect value={[]} onChange={() => {}} />);
    expect(screen.getByText("불러오는 중…")).toBeDefined();
  });

  it("에러 시 실패 문구를 보여준다", async () => {
    getTagsMock.mockRejectedValue(new Error("network"));
    renderWithQc(<TagMultiSelect value={[]} onChange={() => {}} />);
    expect(await screen.findByText("태그를 불러오지 못했습니다.")).toBeDefined();
  });

  it("태그가 없으면 안내 문구를 보여준다", async () => {
    getTagsMock.mockResolvedValue([]);
    renderWithQc(<TagMultiSelect value={[]} onChange={() => {}} />);
    expect(await screen.findByText("등록된 태그가 없습니다.")).toBeDefined();
  });
});
