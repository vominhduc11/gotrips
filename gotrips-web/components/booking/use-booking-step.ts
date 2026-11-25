"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { resolveBookingStep } from "@/lib/booking/steps";
import { parseBookingStep, type BookingStep } from "@/lib/schemas/booking";

/**
 * Bước hiện tại của trang đặt phòng / đặt vé (cùng cơ chế với `BookingWizard` của tour):
 *  - bước nằm trên URL (`?step=`); chuyển bước bằng `window.history.pushState` (Next đồng bộ với `useSearchParams` mà
 *    không điều hướng) — `router.push` sẽ tạo lại page segment và làm mất state form;
 *  - URL đòi "Xác nhận" khi thông tin chưa hợp lệ (vd vừa tải lại trang: thông tin cá nhân không lưu lên URL) → hiển thị
 *    "Thông tin" và sửa URL bằng `replaceState`;
 *  - đổi bước thì đưa focus tới tiêu đề bước (trình đọc màn hình đọc tiêu đề, bàn phím bắt đầu từ đầu bước); bỏ qua lần
 *    render đầu để không cướp focus khi vừa mở trang.
 *
 * `buildSearch(step)` trả chuỗi query (không có `?`) giữ nguyên lựa chọn hiện tại, chỉ đổi bước.
 */
export function useBookingStep({
  isDetailsValid,
  buildSearch,
}: {
  isDetailsValid: boolean;
  buildSearch: (step: BookingStep) => string;
}) {
  const searchParams = useSearchParams();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const requestedStep = parseBookingStep(Object.fromEntries(searchParams.entries()));
  const step = resolveBookingStep(requestedStep, { isDetailsValid });

  function goTo(target: BookingStep, mode: "push" | "replace" = "push") {
    const search = buildSearch(target);
    const url = search ? `?${search}` : window.location.pathname;
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }

  useEffect(() => {
    if (step !== requestedStep) goTo(step, "replace");
  });

  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    headingRef.current?.focus();
  }, [step]);

  return { step, goTo, headingRef };
}
