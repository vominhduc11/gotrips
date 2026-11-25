"use client";

import { LoaderCircle } from "lucide-react";
import { useTransition } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { CounterRow } from "@/components/home/CounterRow";
import { DateRangePicker } from "@/components/home/DatePickers";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startHotelBookingAction } from "@/lib/actions/hotel-booking";
import { changeHotelGuests, getMaxStayGuests, getRoomCountRange } from "@/lib/booking/hotel-stay";
import { countNights } from "@/lib/data/hotel-view";
import { formatVND } from "@/lib/format";
import { isIsoDate } from "@/lib/iso-date";
import { HOTEL_BOOKING_CARD_ID, type HotelStayValues } from "@/lib/schemas/hotel-booking";
import { HOTEL_MAX_GUESTS } from "@/lib/schemas/hotel-search";
import { applyHotelRoom, HOTEL_ROOM_FIELD_ID, useHotelBooking } from "./HotelBookingProvider";
import { StayPriceBreakdown } from "./StayPriceBreakdown";

const labelClass = "font-semibold text-ink";

/**
 * Thẻ "Đặt phòng" bên phải trang chi tiết khách sạn (dính khi cuộn ở màn hình rộng): giá từ, chọn loại phòng, ngày
 * nhận – trả phòng, số khách + số phòng, tiền tạm tính và nút "Đặt phòng". Form thuộc `HotelBookingProvider`.
 * Nút −/+ của số khách/số phòng tự giữ tổ hợp hợp lệ với sức chứa của loại phòng (`changeHotelGuests`).
 */
export function HotelBookingCard({ hotelSlug, minPricePerNight }: { hotelSlug: string; minPricePerNight: number }) {
  const [isNavigating, startTransition] = useTransition();
  const { roomTypes } = useHotelBooking();
  const form = useFormContext<HotelStayValues>();
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    trigger,
    formState: { errors, isSubmitted },
  } = form;
  const [roomTypeId, checkIn, checkOut, guests, rooms] = useWatch({
    control,
    name: ["roomTypeId", "checkIn", "checkOut", "guests", "rooms"],
  });
  const room = roomTypes.find((r) => r.id === roomTypeId);
  const nights = isIsoDate(checkIn) && isIsoDate(checkOut) ? countNights(checkIn, checkOut) : 0;
  const roomRange = getRoomCountRange(guests, room?.maxGuests ?? guests);

  /** Sau lần submit đầu thì validate lại để lỗi chéo (ngày, sức chứa) cập nhật ngay khi khách sửa. */
  const revalidate = () => {
    if (isSubmitted) void trigger();
  };

  function changeGuests(next: number) {
    const stay = changeHotelGuests(getValues(), next, roomTypes);
    setValue("guests", stay.guests, { shouldDirty: true });
    setValue("rooms", stay.rooms, { shouldDirty: true });
    revalidate();
  }

  // Server Action kiểm lựa chọn + phiên rồi chuyển tới trang đặt phòng hoặc đăng nhập (lý do ở `startBookingAction`).
  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await startHotelBookingAction({ ...values, hotelSlug });
      if (!result.ok) toast.error(result.message);
    });
  });

  const id = (name: string) => `${HOTEL_BOOKING_CARD_ID}-${name}`;
  const dateErrors = [errors.checkIn, errors.checkOut];
  const hasDateError = dateErrors.some(Boolean);
  const guestErrors = [errors.guests, errors.rooms];

  return (
    <aside
      id={HOTEL_BOOKING_CARD_ID}
      aria-label="Giá và đặt phòng"
      className="scroll-mt-24 rounded-card bg-surface p-5 shadow-card lg:sticky lg:top-24"
    >
      <p className="text-sm text-ink-muted">Giá từ</p>
      <p className="text-3xl font-extrabold leading-9 text-accent-700">
        {formatVND(minPricePerNight)}
        <span className="text-base font-medium text-ink-muted">/đêm</span>
      </p>

      <form
        onSubmit={onSubmit}
        noValidate
        aria-label="Chọn phòng và đặt phòng"
        className="mt-4 space-y-4 border-t border-line pt-4"
      >
        <Field data-invalid={errors.roomTypeId ? true : undefined}>
          <FieldLabel htmlFor={HOTEL_ROOM_FIELD_ID} className={labelClass}>
            Loại phòng
          </FieldLabel>
          <Select
            value={roomTypeId ? String(roomTypeId) : ""}
            onValueChange={(value) => {
              applyHotelRoom(form, Number(value), roomTypes);
              revalidate();
            }}
          >
            <SelectTrigger
              id={HOTEL_ROOM_FIELD_ID}
              aria-invalid={errors.roomTypeId ? true : undefined}
              aria-describedby={errors.roomTypeId ? id("phong-loi") : undefined}
              className="w-full border-neutral-500 bg-surface px-3 text-base text-ink hover:border-neutral-700 data-[size=default]:h-12"
            >
              <SelectValue placeholder="Chọn loại phòng">{room?.name}</SelectValue>
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-80">
              {roomTypes.map((option) => (
                <SelectItem key={option.id} value={String(option.id)} className="py-2 pl-2.5 *:[span]:last:flex-1">
                  <span className="flex w-full items-center justify-between gap-4">
                    <span>
                      <span className="block font-semibold text-ink">{option.name}</span>
                      <span className="block text-xs text-ink-muted">Tối đa {option.maxGuests} khách/phòng</span>
                    </span>
                    <span className="font-bold text-accent-700">{formatVND(option.pricePerNight)}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id={id("phong-loi")} errors={[errors.roomTypeId]} />
        </Field>

        <Field data-invalid={hasDateError || undefined}>
          <FieldLabel id={id("ngay-label")} htmlFor={id("ngay")} className={labelClass}>
            Ngày nhận – trả phòng
          </FieldLabel>
          <DateRangePicker
            id={id("ngay")}
            labelId={id("ngay-label")}
            from={checkIn}
            to={checkOut}
            onChange={(from, to) => {
              setValue("checkIn", from, { shouldDirty: true });
              setValue("checkOut", to, { shouldDirty: true });
              revalidate();
            }}
            invalid={hasDateError}
            describedBy={hasDateError ? id("ngay-loi") : undefined}
          />
          <FieldError id={id("ngay-loi")} errors={dateErrors} />
        </Field>

        <div className="space-y-3">
          <CounterRow
            label="Số khách"
            value={guests}
            min={1}
            max={getMaxStayGuests(room?.maxGuests ?? 1, HOTEL_MAX_GUESTS)}
            onChange={changeGuests}
          />
          <CounterRow
            label="Số phòng"
            hint={room ? `Tối đa ${room.maxGuests} khách mỗi phòng` : undefined}
            value={rooms}
            min={roomRange.min}
            max={roomRange.max}
            onChange={(next) => {
              setValue("rooms", next, { shouldDirty: true });
              revalidate();
            }}
          />
          <FieldError errors={guestErrors} />
        </div>

        <div className="border-t border-line pt-4">
          {room && nights > 0 ? (
            <StayPriceBreakdown pricePerNight={room.pricePerNight} nights={nights} rooms={rooms} />
          ) : (
            <p className="text-sm text-ink-muted">Chọn ngày nhận – trả phòng để xem tổng tiền.</p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isNavigating} aria-busy={isNavigating}>
          {isNavigating ? (
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
          ) : null}
          Đặt phòng
        </Button>
        <p className="text-center text-sm text-ink-muted">Chưa thanh toán ở bước này.</p>
      </form>
    </aside>
  );
}
