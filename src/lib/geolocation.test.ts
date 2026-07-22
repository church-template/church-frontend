import { describe, it, expect, vi, afterEach } from "vitest";
import { getCurrentPosition } from "./geolocation";

afterEach(() => vi.unstubAllGlobals());

// 표준 GeolocationPositionError 코드 상수(1·2·3)를 실은 오류 객체.
function geoError(code: number): GeolocationPositionError {
  return { code, message: "", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError;
}

describe("getCurrentPosition", () => {
  it("성공 시 좌표를 반환한다", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: 37.5, longitude: 127.0, accuracy: 12 } } as GeolocationPosition),
      },
    });
    await expect(getCurrentPosition()).resolves.toEqual({ latitude: 37.5, longitude: 127.0, accuracy: 12 });
  });

  it("권한 거부(1)면 안내 문구로 reject", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (_ok: PositionCallback, err: PositionErrorCallback) => err(geoError(1)),
      },
    });
    await expect(getCurrentPosition()).rejects.toThrow("위치 권한이 거부되었습니다. 주소를 직접 입력해 주세요.");
  });

  it("타임아웃(3)이면 재시도 안내로 reject", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (_ok: PositionCallback, err: PositionErrorCallback) => err(geoError(3)),
      },
    });
    await expect(getCurrentPosition()).rejects.toThrow("위치를 가져오지 못했습니다. 다시 시도해 주세요.");
  });

  it("미지원 브라우저면 미지원 문구로 reject", async () => {
    vi.stubGlobal("navigator", {});
    await expect(getCurrentPosition()).rejects.toThrow("이 브라우저는 위치를 지원하지 않습니다.");
  });
});
