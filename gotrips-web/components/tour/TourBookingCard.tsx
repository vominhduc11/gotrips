"use client";

import { LoaderCircle } from "lucide-react";
import { useTransition } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { TripPriceBreakdown } from "@/components/booking/TripPriceBreakdown";
import { TripSelectionFields } from "@/components/booking/TripSelectionFields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { startBookingAction } from "@/lib/actions/booking";
import { formatVND } from "@/lib/format";
import { TOUR_BOOKING_CARD_ID, type TripSelectionValues } from "@/lib/schemas/booking";
import type { TourDetailView } from "@/lib/types";
import { useTourBooking } from "./TourBookingProvider";

export type TourBookingCardTour = Pick<TourDetailView, "slug" | "priceFrom" | "originalPriceFrom" | "discountPercent">;

/**
 * Thẻ "Đặt tour" bên phải trang chi tiết (dính khi cuộn ở màn hình rộng): giá từ, chọn ngày khởi hành + số khách, tiền
 * tạm tính và nút "Đặt tour". Chọn lịch nằm ngay ở đây nên trang đặt tour bắt đầu luôn từ bước nhập thông tin.
 * Form thuộc `TourBookingProvider` (dùng chung với nút "Chọn ngày này" ở lịch khởi hành).
 * Tour không còn chuyến nào đặt được (`priceFrom` null) thì nút khoá kèm lời giải thích.
 */
export function TourBookingCard({ tour }: { tour: TourBookingCardTour }) {
  const [isNavigating, startTransition] = useTransition();
  const { departures } = useTourBooking();
  const { control, handleSubmit } = useFormContext<TripSelectionValues>();
  const [departureId, guests] = useWatch({ control, name: ["departureId", "guests"] });
  const selected = departures.find((d) => d.id === departureId && !d.isSoldOut);
  const hasDiscount = tour.discountPercent !== null && tour.originalPriceFrom !== null;

  // Server Action kiểm tra phiên rồi chuyển tới trang đặt tour hoặc trang đăng nhập (lý do ở `startBookingAction`).
  // Chỉ trả về khi dữ liệu không hợp lệ (không xảy ra với form này, trừ khi bị sửa tay).
  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await startBookingAction({ ...values, tourSlug: tour.slug });
      if (!result.ok) toast.error(result.message);
    });
  });

  return (
    <aside
      id={TOUR_BOOKING_CARD_ID}
      aria-label="Giá và đặt tour"
      className="scroll-mt-24 rounded-card bg-surface p-5 shadow-card lg:sticky lg:top-24"
    >
      <p className="text-sm text-ink-muted">Giá từ</p>
      {tour.priceFrom !== null ? (
        <>
          {hasDiscount && tour.originalPriceFrom !== null ? (
            <div className="mt-1 flex items-center gap-2">
              <del className="text-sm text-ink-muted">
                <span className="sr-only">Giá gốc </span>
                {formatVND(tour.originalPriceFrom)}
              </del>
              <Badge variant="discount">Giảm {tour.discountPercent}%</Badge>
            </div>
          ) : null}
          <p className="text-3xl font-extrabold leading-9 text-accent-700">
            {formatVND(tour.priceFrom)}
            <span className="text-base font-medium text-ink-muted">/khách</span>
          </p>

          <form
            onSubmit={onSubmit}
            noValidate
            aria-label="Chọn chuyến và đặt tour"
            className="mt-4 space-y-4 border-t border-line pt-4"
          >
            <TripSelectionFields idPrefix={TOUR_BOOKING_CARD_ID} departures={departures} />
            {selected ? (
              <div className="border-t border-line pt-4">
                <TripPriceBreakdown price={selected.price} guests={guests} />
              </div>
            ) : null}
            <Button type="submit" size="lg" className="w-full" disabled={isNavigating} aria-busy={isNavigating}>
              {isNavigating ? (
                <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
              ) : null}
              Đặt tour
            </Button>
            <p className="text-center text-sm text-ink-muted">Chưa thanh toán ở bước này.</p>
          </form>
        </>
      ) : (
        <>
          <p className="text-2xl font-bold text-ink-muted">Hết chỗ</p>
          <Button disabled size="lg" className="mt-5 w-full" aria-describedby="ghi-chu-dat-tour">
            Đặt tour
          </Button>
          <p id="ghi-chu-dat-tour" className="mt-2 text-center text-sm text-ink-muted">
            Tour đã hết chỗ ở mọi ngày khởi hành.
          </p>
        </>
      )}
    </aside>
  );
}
