"use client";

import { Check } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { HotelStayValues } from "@/lib/schemas/hotel-booking";
import { useHotelBooking } from "./HotelBookingProvider";

/**
 * Nút "Chọn phòng này" ở danh sách loại phòng: chọn phòng trong thẻ "Đặt phòng" (khách còn chọn ngày và số khách ở
 * thẻ). Phòng đang chọn hiện "Đã chọn" để danh sách và thẻ luôn khớp nhau.
 */
export function SelectRoomButton({ roomTypeId, roomName }: { roomTypeId: number; roomName: string }) {
  const { selectRoom } = useHotelBooking();
  const { control } = useFormContext<HotelStayValues>();
  const selected = useWatch({ control, name: "roomTypeId" }) === roomTypeId;

  return (
    <Button type="button" variant={selected ? "primary" : "outline"} size="sm" onClick={() => selectRoom(roomTypeId)}>
      {selected ? <Check aria-hidden="true" className="size-4" /> : null}
      {selected ? "Đã chọn" : "Chọn phòng này"}
      {/* Tên truy cập bắt đầu bằng chữ nhìn thấy, thêm tên phòng để các nút trong danh sách phân biệt được. */}
      <span className="sr-only"> ({roomName})</span>
    </Button>
  );
}
