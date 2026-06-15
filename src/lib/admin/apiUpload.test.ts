// src/lib/admin/apiUpload.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

const { authFetchMock } = vi.hoisted(() => ({ authFetchMock: vi.fn() }));
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));

import { apiUpload } from "./apiUpload";

afterEach(() => vi.clearAllMocks());

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body, clone() { return this; } } as unknown as Response;
}

describe("apiUpload", () => {
  it("배열 쿼리는 같은 키를 반복해 직렬화한다", async () => {
    authFetchMock.mockResolvedValue(okJson({ id: 1 }));
    await apiUpload("/api/admin/gallery/albums/9/photos", { method: "POST", query: { mediaIds: [3, 5] } });
    expect(authFetchMock).toHaveBeenCalledWith(
      "/api/admin/gallery/albums/9/photos?mediaIds=3&mediaIds=5",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("formData를 body로 전달하고 Content-Type은 설정하지 않는다", async () => {
    authFetchMock.mockResolvedValue(okJson({ id: 7 }));
    const fd = new FormData();
    fd.append("file", new File(["x"], "a.png", { type: "image/png" }));
    const res = await apiUpload<{ id: number }>("/api/admin/media", { method: "POST", formData: fd });
    expect(res).toEqual({ id: 7 });
    const init = authFetchMock.mock.calls[0][1];
    expect(init.body).toBe(fd);
    expect(init.headers).toBeUndefined();
  });

  it("204는 undefined를 반환한다", async () => {
    authFetchMock.mockResolvedValue({ ok: false, status: 204 } as Response);
    const res = await apiUpload("/api/admin/x", { method: "POST" });
    expect(res).toBeUndefined();
  });
});
