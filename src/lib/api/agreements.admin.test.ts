// src/lib/api/agreements.admin.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

const { authFetchMock, parseJsonMock } = vi.hoisted(() => ({ authFetchMock: vi.fn(), parseJsonMock: vi.fn() }));
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));
vi.mock("@/lib/auth/apiError", () => ({ parseJson: parseJsonMock }));

import { resetAgreements } from "./agreements.admin";

afterEach(() => vi.clearAllMocks());

describe("약관 어드민 API", () => {
  it("resetAgreements는 POST /api/admin/agreements/reset 에 {target}를 보낸다", async () => {
    authFetchMock.mockResolvedValue({ ok: true } as Response);
    await resetAgreements("terms");
    expect(authFetchMock).toHaveBeenCalledWith("/api/admin/agreements/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "terms" }),
    });
  });
  it("200 본문 없음이어도 파싱하지 않고 통과한다", async () => {
    authFetchMock.mockResolvedValue({ ok: true } as Response);
    await expect(resetAgreements("privacy")).resolves.toBeUndefined();
    expect(parseJsonMock).not.toHaveBeenCalled();
  });
  it("비-2xx면 parseJson으로 ApiError를 던진다", async () => {
    authFetchMock.mockResolvedValue({ ok: false } as Response);
    parseJsonMock.mockRejectedValue(new Error("400"));
    await expect(resetAgreements("terms")).rejects.toThrow();
    expect(parseJsonMock).toHaveBeenCalled();
  });
});
