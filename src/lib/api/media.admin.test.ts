// src/lib/api/media.admin.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

const { authFetchMock, apiMutateMock, apiUploadMock } = vi.hoisted(() => ({
  authFetchMock: vi.fn(),
  apiMutateMock: vi.fn(),
  apiUploadMock: vi.fn(),
}));
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));
vi.mock("@/lib/admin/apiMutate", () => ({ apiMutate: apiMutateMock }));
vi.mock("@/lib/admin/apiUpload", () => ({ apiUpload: apiUploadMock }));

import { listMedia, uploadMedia, getMediaReferences, deleteMedia } from "./media.admin";

afterEach(() => vi.clearAllMocks());
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body, clone() { return this; } } as unknown as Response);

describe("media.admin", () => {
  it("listMedia는 type/from/to/page를 쿼리로 직렬화한다", async () => {
    authFetchMock.mockResolvedValue(ok({ content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } }));
    await listMedia({ type: "image", from: "2026-01-01", page: 2 });
    expect(authFetchMock).toHaveBeenCalledWith("/api/admin/media?type=image&from=2026-01-01&page=2");
  });

  it("uploadMedia는 file을 FormData로 apiUpload에 넘긴다", async () => {
    apiUploadMock.mockResolvedValue({ id: 1 });
    await uploadMedia(new File(["x"], "a.png", { type: "image/png" }));
    const [path, opts] = apiUploadMock.mock.calls[0];
    expect(path).toBe("/api/admin/media");
    expect(opts.method).toBe("POST");
    expect(opts.formData.get("file")).toBeInstanceOf(File);
  });

  it("deleteMedia는 apiMutate DELETE를 호출한다", async () => {
    apiMutateMock.mockResolvedValue(undefined);
    await deleteMedia(42);
    expect(apiMutateMock).toHaveBeenCalledWith("/api/admin/media/42", { method: "DELETE" });
  });

  it("getMediaReferences는 references 엔드포인트를 파싱한다", async () => {
    authFetchMock.mockResolvedValue(ok({ mediaId: 42, inUse: true, references: [{ type: "sermon", id: 1, title: "설교" }] }));
    const r = await getMediaReferences(42);
    expect(r.inUse).toBe(true);
    expect(r.references[0].title).toBe("설교");
  });
});
