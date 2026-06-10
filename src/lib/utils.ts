import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// className 병합·충돌 해소(shadcn 표준 cn). variant 클래스 + 소비자 className override 안전.
// 위치는 shadcn 기본 경로(@/lib/utils) — T04 동작 컴포넌트가 무수정 import.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
