// 좌표 → 카카오맵 핀 URL(SDK·키 불필요). 회원 카드·기사 명단이 공유.
// 형식: /link/map/{이름},{위도},{경도} — 이름 라벨로 핀 표시, 모바일은 카카오맵 앱 연계.
// church.ts의 mapSearchUrl(주소 검색)과 별개 — 이건 좌표 핀.
export function kakaoMapPinUrl(latitude: number, longitude: number, label = "픽업 위치"): string {
  const name = label.trim() === "" ? "픽업 위치" : label;
  return `https://map.kakao.com/link/map/${encodeURIComponent(name)},${latitude},${longitude}`;
}
