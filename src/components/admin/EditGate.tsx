import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

// 편집 라우트에서 권한 미보유 시 RequirePermission fallback으로 사용.
export function EditAccessDenied() {
  return (
    <p className={cn(typo.bodyMd, "text-muted")}>이 페이지를 열 권한이 없습니다.</p>
  );
}
