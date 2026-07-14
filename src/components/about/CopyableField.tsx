"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { notify } from "@/lib/notify";

// 길게 누르기 판정 시간. 스크롤·탭과 구분되면서 고령 사용자가 답답하지 않은 지점.
const LONG_PRESS_MS = 500;
// 복사 확인 아이콘(체크)을 유지하는 시간.
const COPIED_FEEDBACK_MS = 2000;

interface Props {
  /** 항목명(주소·전화번호·이메일 주소). 토스트 문구가 "…를 복사했습니다"라 받침 없는 말로 짓는다. */
  label: string;
  /** 실제로 복사되는 값 */
  value: string;
  /** 있으면 값이 링크가 된다(tel:·mailto:) */
  href?: string;
}

// 연락처 한 줄 — 탭하면 전화/메일, 복사 버튼이나 길게 누르기로 값을 복사한다.
// 복사 버튼을 항상 노출하는 이유: 길게 누르기는 보이지 않는 제스처라 그것만으로는 알 수 없다(고령 사용자).
export function CopyableField({ label, value, href }: Props) {
  const [copied, setCopied] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 길게 눌러 복사한 직후의 click(=링크 이동)을 막기 위한 표식.
  const longPressed = useRef(false);

  useEffect(() => {
    return () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      notify.success(`${label}를 복사했습니다.`);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // 클립보드 권한·비보안 컨텍스트에서 실패 — 직접 선택해 복사하도록 안내한다(침묵 금지).
      notify.error("복사하지 못했습니다. 값을 직접 선택해 복사해 주세요.");
    }
  }

  function startPress() {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      void copy();
    }, LONG_PRESS_MS);
  }
  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }

  return (
    <div
      className="border-b border-hairline py-base"
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
    >
      <dt className={cn(typo.captionStrong, "text-muted")}>{label}</dt>
      <dd className="mt-xs flex items-center justify-between gap-sm">
        {href ? (
          <a
            href={href}
            className={cn(typo.bodyLg, "break-all text-ink hover:text-primary")}
            // 길게 눌러 복사한 뒤 손을 떼면 click이 이어져 전화 앱이 열린다 — 그 한 번만 막는다.
            onClick={(e) => {
              if (longPressed.current) e.preventDefault();
            }}
          >
            {value}
          </a>
        ) : (
          <span className={cn(typo.bodyLg, "break-all text-ink")}>{value}</span>
        )}

        <button
          type="button"
          aria-label={`${label} 복사`}
          onClick={copy}
          className={cn(
            "inline-flex size-12 shrink-0 items-center justify-center rounded-md text-muted",
            "transition-colors hover:bg-surface-strong hover:text-ink",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          )}
        >
          {copied ? <Check size={20} aria-hidden className="text-primary" /> : <Copy size={20} aria-hidden />}
        </button>
      </dd>
    </div>
  );
}
