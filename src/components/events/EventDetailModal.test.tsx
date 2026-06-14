import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const { notifyError } = vi.hoisted(() => ({ notifyError: vi.fn() }));
vi.mock("@/lib/notify", () => ({ notify: { error: notifyError, success: vi.fn() } }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
// EventDetailActions는 useMe(useQuery)→QueryClient 의존이라 모달 단위 테스트 맥락에서 null-스텁(02 선례).
vi.mock("@/components/events/EventAdminActions", () => ({ EventDetailActions: () => null }));

import { EventDetailModal } from "./EventDetailModal";
import type { EventCardResponse } from "@/lib/api/types";

afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

const card: EventCardResponse = {
  id: 3, title: "성가대 연습", location: "본당", startAt: "2026-06-14T10:00:00",
  endAt: "2026-06-14T12:00:00", allDay: false, tags: [],
};
const detail = { ...card, description: "악보 지참", createdAt: "x", updatedAt: "x", version: 0 };

describe("EventDetailModal", () => {
  it("선택 시 제목 즉시 표시 + fetch 후 description", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => detail }) as Response));
    render(<EventDetailModal event={card} onClose={() => {}} />);
    expect(screen.getByText("성가대 연습")).toBeDefined(); // 카드 데이터 즉시(DialogTitle)
    await waitFor(() =>
      expect(document.body.textContent).toContain("악보 지참"),
    );
  });
  it("fetch 실패 시 notify.error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 }) as Response));
    render(<EventDetailModal event={card} onClose={() => {}} />);
    await waitFor(() => expect(notifyError).toHaveBeenCalled());
  });
  it("event=null이면 fetch 미호출(닫힘)", () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    render(<EventDetailModal event={null} onClose={() => {}} />);
    expect(spy).not.toHaveBeenCalled();
  });
});
