// 텍스트 스타일 상수 — DESIGN.md 타이포 위계를 이름으로 노출한다.
// 실제 size/line-height/weight/letter-spacing은 globals.css `@theme --text-*`에 단일 정의되고,
// 여기서는 그걸 생성한 Tailwind 유틸(text-display-mega 등)을 의미 이름으로 매핑만 한다.
//
// 사용: <h1 className={typo.displayMega}>은샘교회</h1>
//      <span className={`${typo.titleMd} text-primary`}>강조</span>   // 색 오버라이드
export const typo = {
  displayMega: "text-display-mega",
  displayXl: "text-display-xl",
  displayLg: "text-display-lg",
  displayMd: "text-display-md",
  displaySm: "text-display-sm",
  titleLg: "text-title-lg",
  titleMd: "text-title-md",
  titleSm: "text-title-sm",
  bodyMd: "text-body-md",
  bodyLg: "text-body-lg", // 읽는 본문 강조(소망·이야기 등) — 고령 가독
  bodyStrong: "text-body-strong",
  bodySm: "text-body-sm",
  datetime: "text-datetime tabular-nums", // 날짜·시간 자릿수 고정(tnum)
  caption: "text-caption",
  captionStrong: "text-caption-strong",
  button: "text-button",
  navLink: "text-nav-link",
} as const;

export type TypoToken = keyof typeof typo;
