import { BedDouble, Calendar, Clock, MapPin, Pencil, Users } from "lucide-react";
import { AppLink } from "@/components/common/AppLink";
import { CoverImage } from "@/components/common/CoverImage";
import { Button } from "@/components/ui/button";
import { countNights } from "@/lib/data/hotel-view";
import { formatDate } from "@/lib/format";
import type { HotelStayValues } from "@/lib/schemas/hotel-booking";
import type { HotelDetailView, HotelRoomTypeView } from "@/lib/types";
import { StayPriceBreakdown } from "./StayPriceBreakdown";

/** Phần thông tin khách sạn mà luồng đặt phòng cần (gửi sang Client Component nên chỉ lấy đủ dùng). */
export type BookingHotel = Pick<
  HotelDetailView,
  "slug" | "name" | "area" | "imageUrl" | "imageAlt" | "checkInTime" | "checkOutTime"
>;

/**
 * Thẻ tóm tắt bên cạnh form đặt phòng (dính khi cuộn ở màn hình rộng): khách sạn, phòng, kỳ lưu trú và tiền TẠM TÍNH
 * (server tính lại lúc tạo đơn). "Thay đổi" mở lại thẻ "Đặt phòng" ở trang chi tiết với lựa chọn hiện tại; thông tin
 * đã nhập vẫn còn khi quay lại (Next giữ trang này trong `<Activity>`).
 */
export function HotelBookingSummaryCard({
  hotel,
  room,
  stay,
  changeHref,
}: {
  hotel: BookingHotel;
  room: HotelRoomTypeView;
  stay: HotelStayValues;
  /** Không có khi đang gửi đơn (khoá nút). */
  changeHref?: string;
}) {
  const nights = countNights(stay.checkIn, stay.checkOut);

  return (
    <aside aria-label="Tóm tắt đơn đặt phòng" className="rounded-card bg-surface shadow-card lg:sticky lg:top-24">
      <div className="relative aspect-16/9 overflow-hidden rounded-t-card">
        <CoverImage src={hotel.imageUrl} alt={hotel.imageAlt} sizes="(min-width: 1024px) 352px, 100vw" />
      </div>
      <div className="p-5">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-primary-800">
          <MapPin aria-hidden="true" className="size-4" />
          {hotel.area}
        </p>
        <p className="mt-1 font-bold leading-6 text-ink">{hotel.name}</p>

        <div className="mt-4 flex items-start justify-between gap-3 border-t border-line pt-4">
          <ul className="space-y-2 text-sm text-ink">
            <li className="flex items-center gap-2">
              <BedDouble aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
              <span className="font-semibold">
                {stay.rooms} × {room.name}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Calendar aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
              <span>
                <time dateTime={stay.checkIn}>{formatDate(stay.checkIn)}</time> –{" "}
                <time dateTime={stay.checkOut}>{formatDate(stay.checkOut)}</time> ({nights} đêm)
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Users aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
              <span className="font-semibold">{stay.guests} khách</span>
            </li>
            <li className="flex items-center gap-2 text-ink-muted">
              <Clock aria-hidden="true" className="size-4 shrink-0" />
              Nhận phòng từ {hotel.checkInTime}, trả trước {hotel.checkOutTime}
            </li>
          </ul>
          {changeHref ? (
            <Button asChild variant="ghost" size="sm" className="-mt-1.5 -mr-2 shrink-0">
              <AppLink href={changeHref}>
                <Pencil aria-hidden="true" className="size-4" />
                Thay đổi
                <span className="sr-only"> phòng, ngày hoặc số khách</span>
              </AppLink>
            </Button>
          ) : null}
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <StayPriceBreakdown pricePerNight={room.pricePerNight} nights={nights} rooms={stay.rooms} />
        </div>
      </div>
    </aside>
  );
}
