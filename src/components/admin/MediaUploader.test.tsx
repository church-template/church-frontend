// src/components/admin/MediaUploader.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { uploadMediaMock, notifyError } = vi.hoisted(() => ({ uploadMediaMock: vi.fn(), notifyError: vi.fn() }));
vi.mock("@/lib/api/media.admin", () => ({ uploadMedia: uploadMediaMock }));
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: notifyError } }));

import { MediaUploader } from "./MediaUploader";

afterEach(() => vi.clearAllMocks());

function fileInput(container: HTMLElement) {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

describe("MediaUploader", () => {
  it("허용 형식을 업로드하면 onUploaded로 결과를 올린다", async () => {
    uploadMediaMock.mockResolvedValue({ id: 9, filename: "a.png" });
    const onUploaded = vi.fn();
    const { container } = render(<MediaUploader accept="image" onUploaded={onUploaded} />);
    fireEvent.change(fileInput(container), {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith([{ id: 9, filename: "a.png" }]));
  });

  it("미허용 형식은 검증 에러를 보이고 업로드하지 않는다", async () => {
    const onUploaded = vi.fn();
    const { container } = render(<MediaUploader accept="pdf" onUploaded={onUploaded} />);
    fireEvent.change(fileInput(container), {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });
    await waitFor(() => expect(screen.getByText(/허용하지 않는 형식/)).toBeDefined());
    expect(uploadMediaMock).not.toHaveBeenCalled();
  });

  it("다중 업로드 중 일부만 실패해도 성공분을 onUploaded로 전달한다", async () => {
    uploadMediaMock
      .mockResolvedValueOnce({ id: 1, filename: "a.png" })
      .mockRejectedValueOnce(new Error("network"));
    const onUploaded = vi.fn();
    const { container } = render(<MediaUploader accept="image" multiple onUploaded={onUploaded} />);
    fireEvent.change(fileInput(container), {
      target: {
        files: [
          new File(["x"], "a.png", { type: "image/png" }),
          new File(["y"], "b.png", { type: "image/png" }),
        ],
      },
    });
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith([{ id: 1, filename: "a.png" }]));
  });
});
