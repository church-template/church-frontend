import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
  it("기존 태그를 선택하면 onChange로 tagIds를 올린다", async () => {
    getTagsMock.mockResolvedValue([
      { id: 1, name: "청년부" },
      { id: 2, name: "주일예배" },
    ]);
    const onChange = vi.fn();
    renderWithQc(<TagMultiSelect value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "태그 선택" }));
    await waitFor(() => expect(screen.getByText("청년부")).toBeDefined());
    fireEvent.click(screen.getByText("청년부"));
    expect(onChange).toHaveBeenCalledWith([1]);
  });

  it("이미 선택된 태그는 칩(Badge)으로 보인다", async () => {
    getTagsMock.mockResolvedValue([{ id: 1, name: "청년부" }]);
    renderWithQc(<TagMultiSelect value={[1]} onChange={() => {}} />);
    await waitFor(() => expect(screen.getAllByText("청년부").length).toBeGreaterThan(0));
  });
});
