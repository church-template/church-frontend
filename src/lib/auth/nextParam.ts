// ?next= 복귀 파라미터 처리 — 로그인·가입·재동의 3페이지 공용(스펙 4.4).

// 오픈 리다이렉트 방지: "/"로 시작하는 내부 경로만 허용.
// "//host"(프로토콜 상대)·"/\\host"(브라우저가 \를 /로 정규화)·제어문자(브라우저가 strip 후
// //로 해석할 수 있음)는 모두 외부 이탈 벡터라 차단한다.
export function sanitizeNext(raw: string | null | undefined): string {
  if (!raw || raw[0] !== "/" || raw[1] === "/" || raw[1] === "\\") return "/";
  if (/[\x00-\x20]/.test(raw)) return "/";
  return raw;
}

// 로그인(가입 후 자동 로그인 포함) 성공 직후 목적지.
// requiresAgreement면 재동의로 체이닝하되 next를 유지한다(스펙 4.1·4.2).
export function afterLoginDestination(
  requiresAgreement: boolean,
  rawNext: string | null | undefined,
): string {
  const next = sanitizeNext(rawNext);
  if (!requiresAgreement) return next;
  return next === "/" ? "/agreements" : `/agreements?next=${encodeURIComponent(next)}`;
}
