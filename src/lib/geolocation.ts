// 브라우저 위치 래퍼 — navigator.geolocation.getCurrentPosition을 프로미스로.
// 회원 신청의 "현재 위치 첨부" 전용. 오류 코드를 사용자 문구로 매핑해 reject(호출부가 토스트).
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("이 브라우저는 위치를 지원하지 않습니다."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(new Error(geolocationErrorMessage(err))),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

// GeolocationPositionError.code → 한글 문구.
function geolocationErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "위치 권한이 거부되었습니다. 주소를 직접 입력해 주세요.";
    case err.POSITION_UNAVAILABLE:
      return "현재 위치를 확인할 수 없습니다.";
    case err.TIMEOUT:
      return "위치를 가져오지 못했습니다. 다시 시도해 주세요.";
    default:
      return "위치를 가져오지 못했습니다.";
  }
}
