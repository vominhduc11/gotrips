"use client";

import { Check } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { TripSelectionValues } from "@/lib/schemas/booking";
import { useTourBooking } from "./TourBookingProvider";

/**
 * Nút "Chọn ngày này" ở lịch khởi hành: chọn chuyến trong thẻ "Đặt tour" (không mở trang đặt tour ngay — khách còn
 * chỉnh số khách và xem tổng tiền ở thẻ). Chuyến đang được chọn hiện "Đã chọn" để danh sách và thẻ luôn khớp nhau.
 */
export function SelectDepartureButton({ departureId, dateLabel }: { departureId: number; dateLabel: string }) {
  const { selectDeparture } = useTourBooking();
  const { control } = useFormContext<TripSelectionValues>();
  const selected = useWatch({ control, name: "departureId" }) === departureId;

  return (
    <Button
      type="button"
      variant={selected ? "primary" : "outline"}
      size="sm"
      onClick={() => selectDeparture(departureId)}
    >
      {selected ? <Check aria-hidden="true" className="size-4" /> : null}
      {selected ? "Đã chọn" : "Chọn ngày này"}
      {/* Tên truy cập vẫn bắt đầu bằng chữ nhìn thấy, thêm ngày để các nút trong danh sách phân biệt được. */}
      <span className="sr-only"> ({dateLabel})</span>
    </Button>
  );
}
