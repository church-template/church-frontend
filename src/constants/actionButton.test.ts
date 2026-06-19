import { describe, it, expect } from "vitest";
import { ACTION, CREATE_ICON, createLabel } from "./actionButton";

describe("actionButton", () => {
  it("핵심 액션 라벨이 고정돼 있다", () => {
    expect(ACTION.edit.label).toBe("수정");
    expect(ACTION.delete.label).toBe("삭제");
    expect(ACTION.save.label).toBe("저장");
    expect(ACTION.cancel.label).toBe("취소");
  });
  it("아이콘 컴포넌트를 노출한다", () => {
    expect(typeof ACTION.edit.Icon).toBe("object"); // lucide forwardRef
    expect(CREATE_ICON).toBeDefined();
  });
  it("생성 라벨을 엔티티로 조합한다", () => {
    expect(createLabel("역할")).toBe("새 역할");
  });
});
