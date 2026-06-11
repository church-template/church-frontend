// 스크럽 연출 공용 수학 헬퍼 — CrossHero(동결) 내부 헬퍼와 동일 산식.
// 동결 파일의 export를 바꾸지 않기 위해 별도 모듈로 둔다(MediaCollage 스펙 §3).
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const segment = (p: number, s: number, e: number) => clamp01((p - s) / (e - s));
/** 처음 빠르게 빠지고 끝에서 안착 — 중앙 카드 축소용(스펙 §4) */
export const easeOut = (t: number) => 1 - (1 - t) ** 3;
