"use client";

// 루트 레이아웃까지 붕괴한 최후 바운더리 — globals.css·폰트가 보장되지 않으므로
// 예외적으로 최소 인라인 스타일만 사용한다(DESIGN no-inline 규칙의 명시적 예외, 스펙 §8.3).
// 자체 <html><body>를 포함해야 한다(루트 레이아웃을 대체).
export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#0a0b0d" /* --color-ink */,
          background: "#ffffff" /* --color-canvas */,
        }}
      >
        <title>문제가 발생했습니다</title>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500 }}>문제가 발생했습니다</h1>
        <p style={{ margin: 0, color: "#7c828a" /* --color-body */ }}>
          페이지를 표시할 수 없습니다. 다시 시도해 주세요.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          style={{
            height: 44,
            padding: "0 20px",
            borderRadius: 16,
            border: "none",
            background: "#0052ff" /* --color-primary — 리브랜드 시 교체 */,
            color: "#ffffff" /* --color-canvas */,
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
