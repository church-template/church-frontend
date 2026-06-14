import { describe, it, expect, vi, afterEach } from "vitest";

const { apiMutateMock } = vi.hoisted(() => ({ apiMutateMock: vi.fn() }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));

import { createEvent, updateEvent, deleteEvent } from "./events.admin";

afterEach(() => vi.clearAllMocks());

describe("일정 어드민 API", () => {
  it("createEvent은 POST /api/admin/events로 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 4 });
    await createEvent({ title: "수련회", startAt: "2026-06-14T10:00:00" });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/events", {
      method: "POST",
      body: { title: "수련회", startAt: "2026-06-14T10:00:00" },
    });
  });

  it("updateEvent은 PUT /{id}로 version 포함 body를 보낸다", async () => {
    apiMutateMock.mockResolvedValue({ id: 4 });
    await updateEvent(4, { title: "수련회", startAt: "2026-06-14T10:00:00", version: 2 });
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/events/4", {
      method: "PUT",
      body: { title: "수련회", startAt: "2026-06-14T10:00:00", version: 2 },
    });
  });

  it("deleteEvent은 DELETE /{id}", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteEvent(4);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/events/4", { method: "DELETE" });
  });
});
