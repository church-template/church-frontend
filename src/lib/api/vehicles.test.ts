import { describe, it, expect, vi, beforeEach } from "vitest";

const authFetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));

import { fetchVehicleRuns, applyVehicleRequest, cancelVehicleRequest, VEHICLE_RUN_PAGE_SIZE } from "./vehicles";

function jsonRes(data: unknown) {
  return new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
}
const emptyPage = { content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } };

beforeEach(() => authFetchMock.mockReset());

describe("vehicles 회원 API", () => {
  it("fetchVehicleRuns: page·size 쿼리(정렬은 백엔드 기본)", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes(emptyPage)));
    await fetchVehicleRuns({ page: 2 });
    expect(authFetchMock).toHaveBeenCalledWith(`/api/vehicle-runs?page=2&size=${VEHICLE_RUN_PAGE_SIZE}`);
  });

  it("applyVehicleRequest: POST JSON body", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes({ id: 1, runId: 5, pickupLocation: "정문" })));
    const r = await applyVehicleRequest(5, { pickupLocation: "정문", note: "2명" });
    expect(authFetchMock).toHaveBeenCalledWith("/api/vehicle-runs/5/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickupLocation: "정문", note: "2명" }),
    });
    expect(r.runId).toBe(5);
  });

  it("cancelVehicleRequest: DELETE, 204면 본문 파싱 없이 성공", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })));
    await expect(cancelVehicleRequest(5)).resolves.toBeUndefined();
    expect(authFetchMock).toHaveBeenCalledWith("/api/vehicle-runs/5/requests/me", { method: "DELETE" });
  });

  it("cancelVehicleRequest: 비-2xx면 ApiError로 reject", async () => {
    authFetchMock.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ errorCode: "RESOURCE_NOT_FOUND", title: "리소스 없음", status: 404 }), {
        status: 404, headers: { "content-type": "application/json" },
      })),
    );
    await expect(cancelVehicleRequest(5)).rejects.toMatchObject({ errorCode: "RESOURCE_NOT_FOUND" });
  });
});
