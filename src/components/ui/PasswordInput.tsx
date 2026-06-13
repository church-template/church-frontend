"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input, type InputProps } from "@/components/ui/Input";

// 비밀번호 입력 변형(DESIGN password-input). text-input을 그대로 감싸 스타일·에러·접근성 배선을
// 재사용하고, 우측에 표시/숨기기 토글(lucide Eye/EyeOff)을 오버레이한다. type=password↔text 전환.
export type PasswordInputProps = Omit<InputProps, "type" | "variant">;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        {/* pr-12: 토글 버튼(48px) 영역만큼 우측 패딩을 줘 입력 텍스트가 아이콘과 겹치지 않게 한다. */}
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-12", className)}
          {...props}
        />
        <button
          type="button"
          aria-label={visible ? "비밀번호 숨기기" : "비밀번호 표시"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className={cn(
            "absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-sm text-muted",
            "transition-colors hover:text-ink",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          )}
        >
          {visible ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
