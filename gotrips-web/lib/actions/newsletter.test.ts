import { beforeEach, describe, expect, it, vi } from "vitest";

// `server-only` ném lỗi khi import ngoài môi trường server của Next (http.ts import nó).
vi.mock("server-only", () => ({}));

const { subscribeNewsletter } = vi.hoisted(() => ({ subscribeNewsletter: vi.fn() }));
vi.mock("@/lib/api/generated", () => ({ subscribeNewsletter }));

import { ApiError } from "@/lib/api/http";
import { SERVICE_UNAVAILABLE_MESSAGE } from "./messages";
import { subscribeNewsletterAction } from "./newsletter";

describe("subscribeNewsletterAction", () => {
  beforeEach(() => {
    subscribeNewsletter.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("gọi API với email đã chuẩn hoá (bỏ khoảng trắng) và trả ok", async () => {
    subscribeNewsletter.mockResolvedValue({ data: undefined, status: 204 });

    await expect(subscribeNewsletterAction({ email: "  ban@example.com " })).resolves.toEqual({ ok: true });
    expect(subscribeNewsletter).toHaveBeenCalledWith({ email: "ban@example.com" });
  });

  it("email sai định dạng bị chặn ở server, không gọi API", async () => {
    const result = await subscribeNewsletterAction({ email: "khong-hop-le" });

    expect(result).toEqual({
      ok: false,
      fieldErrors: { email: "Địa chỉ email chưa đúng định dạng, ví dụ: ban@example.com." },
    });
    expect(subscribeNewsletter).not.toHaveBeenCalled();
  });

  it("dữ liệu không phải object cũng không làm action ném lỗi", async () => {
    await expect(subscribeNewsletterAction(undefined)).resolves.toMatchObject({ ok: false });
    expect(subscribeNewsletter).not.toHaveBeenCalled();
  });

  it("400 kèm errors[] theo field → gắn lại đúng ô email (fromApiFieldErrors)", async () => {
    subscribeNewsletter.mockRejectedValue(
      new ApiError({
        status: 400,
        title: "Dữ liệu không hợp lệ",
        detail: "Dữ liệu gửi lên không hợp lệ",
        errors: [
          { field: "email", message: "API: email chưa đúng định dạng." },
          { field: "khong-co-o-nay", message: "bỏ qua" },
        ],
      }),
    );

    await expect(subscribeNewsletterAction({ email: "ban@example.com" })).resolves.toEqual({
      ok: false,
      fieldErrors: { email: "API: email chưa đúng định dạng." },
    });
  });

  it("4xx không có field nào khớp → lỗi chung bằng detail của API", async () => {
    subscribeNewsletter.mockRejectedValue(new ApiError({ status: 400, title: "Dữ liệu không hợp lệ", detail: "Có lỗi." }));

    await expect(subscribeNewsletterAction({ email: "ban@example.com" })).resolves.toEqual({
      ok: false,
      message: "Có lỗi.",
    });
  });

  it("5xx → 'Hệ thống đang bận…' và log không chứa email", async () => {
    subscribeNewsletter.mockRejectedValue(new ApiError({ status: 503, title: "Service Unavailable" }));

    await expect(subscribeNewsletterAction({ email: "bi-mat@example.com" })).resolves.toEqual({
      ok: false,
      message: SERVICE_UNAVAILABLE_MESSAGE,
    });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("bi-mat@example.com");
  });

  it("lỗi mạng / hết thời gian chờ → 'Hệ thống đang bận…'", async () => {
    subscribeNewsletter.mockRejectedValue(new TypeError("fetch failed"));
    await expect(subscribeNewsletterAction({ email: "ban@example.com" })).resolves.toEqual({
      ok: false,
      message: SERVICE_UNAVAILABLE_MESSAGE,
    });

    subscribeNewsletter.mockRejectedValue(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
    await expect(subscribeNewsletterAction({ email: "ban@example.com" })).resolves.toEqual({
      ok: false,
      message: SERVICE_UNAVAILABLE_MESSAGE,
    });
  });
});
