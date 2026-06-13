// 한국 전화번호 자동 하이픈 — 입력칸 표시 전용(고령 가독성). 진행형 그룹핑이라 타이핑 중에도 자연스럽다.
// 서울(02)은 2자리 지역번호, 그 외(010 휴대폰 포함)는 3자리. 백엔드가 하이픈을 떼고 정규화하므로
// 전송 값은 이 포맷 그대로 보내도 무방하다(가이드 11장).
export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11); // 숫자만, 최대 11자리
  if (d.startsWith("02")) {
    if (d.length <= 2) return d;
    if (d.length <= 6) return `${d.slice(0, 2)}-${d.slice(2)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  }
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}
