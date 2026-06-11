import { describe, it, expect } from "vitest";
import { ApiError, parseJson } from "./apiError";

describe("parseJson", () => {
  it("res.ok면 JSON을 반환한다", async () => {
    const res = new Response(JSON.stringify({ uuid: "u1" }), { status: 200 });
    await expect(parseJson<{ uuid: string }>(res)).resolves.toEqual({ uuid: "u1" });
  });

  it("403이면 ApiError(status·errorCode)를 throw한다", async () => {
    const res = new Response(
      JSON.stringify({ errorCode: "ACCESS_DENIED", detail: "권한 없음" }),
      { status: 403 },
    );
    await expect(parseJson(res)).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
      errorCode: "ACCESS_DENIED",
    });
  });

  it("401 본문이 비어도 throw한다(errorCode undefined 허용)", async () => {
    const res = new Response("", { status: 401 });
    await expect(parseJson(res)).rejects.toBeInstanceOf(ApiError);
  });
});
