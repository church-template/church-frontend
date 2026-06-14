import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

function setup(over: Partial<React.ComponentProps<typeof DeleteConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <DeleteConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="설교를 삭제할까요?"
      onConfirm={onConfirm}
      {...over}
    />,
  );
  return { onConfirm, onOpenChange };
}

describe("DeleteConfirmDialog", () => {
  it("열리면 제목을 표시한다", () => {
    setup();
    expect(screen.queryByText("설교를 삭제할까요?")).not.toBeNull();
  });

  it("확정 버튼 클릭 시 onConfirm 호출(비번 불요)", () => {
    const { onConfirm } = setup({ confirmLabel: "삭제" });
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });

  it("requirePassword: 미입력이면 확정 비활성, 입력 후 password 전달", () => {
    const { onConfirm } = setup({ requirePassword: true, confirmLabel: "탈퇴" });
    const confirm = screen.getByRole("button", { name: "탈퇴" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "pw123456" } });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith({ password: "pw123456" });
  });
});
