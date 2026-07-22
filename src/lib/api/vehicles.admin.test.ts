import { describe, it, expect, vi, beforeEach } from "vitest";

const authFetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/authFetch", () => ({ authFetch: authFetchMock }));

import {
  fetchAdminVehicleRuns, fetchVehicleRoster,
  createVehicleRun, patchVehicleRun, deleteVehicleRun,
  VEHICLE_ADMIN_PAGE_SIZE, VEHICLE_ROSTER_PAGE_SIZE,
} from "./vehicles.admin";

function jsonRes(data: unknown) {
  return new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
}
const emptyPage = { content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } };

beforeEach(() => authFetchMock.mockReset());

describe("vehicles 어드민 API", () => {
  it("fetchAdminVehicleRuns: page·size 쿼리", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes(emptyPage)));
    await fetchAdminVehicleRuns({ page: 1 });
    expect(authFetchMock).toHaveBeenCalledWith(`/api/admin/vehicle-runs?page=1&size=${VEHICLE_ADMIN_PAGE_SIZE}`);
  });

  it("fetchVehicleRoster: 운행일 경로 + page·size(20)", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes(emptyPage)));
    await fetchVehicleRoster(3, { page: 0 });
    expect(authFetchMock).toHaveBeenCalledWith(`/api/admin/vehicle-runs/3/requests?page=0&size=${VEHICLE_ROSTER_PAGE_SIZE}`);
  });

  it("createVehicleRun: POST JSON", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes({ id: 1, departsAt: "2026-07-26T07:30:00", version: 0 })));
    await createVehicleRun({ departsAt: "2026-07-26T07:30:00", note: "본당 앞 출발" });
    expect(authFetchMock).toHaveBeenCalledWith("/api/admin/vehicle-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departsAt: "2026-07-26T07:30:00", note: "본당 앞 출발" }),
    });
  });

  it("patchVehicleRun: PATCH에 version 포함", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(jsonRes({ id: 1, departsAt: "2026-07-26T08:00:00", version: 1 })));
    await patchVehicleRun(1, { departsAt: "2026-07-26T08:00:00", note: "", version: 0 });
    expect(authFetchMock).toHaveBeenCalledWith("/api/admin/vehicle-runs/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departsAt: "2026-07-26T08:00:00", note: "", version: 0 }),
    });
  });

  it("deleteVehicleRun: DELETE 204 → void", async () => {
    authFetchMock.mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })));
    await expect(deleteVehicleRun(1)).resolves.toBeUndefined();
    expect(authFetchMock).toHaveBeenCalledWith("/api/admin/vehicle-runs/1", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: undefined,
    });
  });
});
