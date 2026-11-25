"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createContext, useContext, useEffect, useLayoutEffect, type ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { applyTripDeparture, tripDepartureFieldId } from "@/components/booking/TripSelectionFields";
import { resolveTripSelection } from "@/lib/booking/steps";
import {
  buildTripSearch,
  parseBookingParams,
  TOUR_BOOKING_CARD_ID,
  tripSelectionSchema,
  type TripSelectionValues,
} from "@/lib/schemas/booking";
import type { TourDepartureView } from "@/lib/types";

type TourBookingContextValue = {
  departures: TourDepartureView[];
  /** Chọn chuyến từ lịch khởi hành: đổi lựa chọn trong thẻ "Đặt tour" rồi đưa khách tới ô chọn ngày của thẻ. */
  selectDeparture: (departureId: number) => void;
};

const TourBookingContext = createContext<TourBookingContextValue | null>(null);

export function useTourBooking(): TourBookingContextValue {
  const value = useContext(TourBookingContext);
  if (!value) throw new Error("useTourBooking phải được dùng bên trong <TourBookingProvider>.");
  return value;
}

/**
 * Lựa chọn chuyến + số khách của trang chi tiết tour: MỘT form React Hook Form dùng chung cho thẻ "Đặt tour" và các nút
 * "Chọn ngày này" ở lịch khởi hành (hai nơi xa nhau trong cây nên form nằm ở provider bọc cả hai).
 *
 * Đồng bộ với URL (`?departure&guests`) mà KHÔNG dùng `useSearchParams`: hook đó buộc phần này render theo request, làm
 * trang chi tiết mất static shell. Thay vào đó:
 *  - URL → form: đọc `window.location` sau khi mount (cả khi Next hiện lại trang đang ẩn bằng `<Activity>`: effect chạy
 *    lại). Nhờ vậy liên kết "chọn lại chuyến" từ trang đặt tour điền sẵn được lựa chọn cũ.
 *  - form → URL: khách đổi lựa chọn thì `replaceState`, để tải lại trang hoặc bấm Back từ trang đặt tour vẫn giữ lựa chọn.
 */
export function TourBookingProvider({
  departures,
  children,
}: {
  departures: TourDepartureView[];
  children: ReactNode;
}) {
  const form = useForm<TripSelectionValues>({
    resolver: zodResolver(tripSelectionSchema),
    // HTML prerender chọn sẵn chuyến gần nhất còn chỗ; URL (nếu có) được áp ngay sau khi mount.
    defaultValues: resolveTripSelection({ departure: undefined, guests: 1 }, departures),
  });

  // useLayoutEffect: áp lựa chọn trên URL trước khi trình duyệt vẽ, tránh nháy từ ngày mặc định sang ngày trên URL.
  useLayoutEffect(() => {
    const params = parseBookingParams(Object.fromEntries(new URLSearchParams(window.location.search)));
    const selection = resolveTripSelection(params, departures);
    form.setValue("departureId", selection.departureId);
    form.setValue("guests", selection.guests);
  }, [departures, form]);

  // Khai báo SAU effect đọc URL ở trên: lần áp URL lúc mount không bị ghi ngược lại lên URL.
  // `subscribe` (không phải `watch(callback)`): nghe thay đổi mà không render lại, và hợp với React Compiler.
  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: ({ values }) => {
          const search = buildTripSearch({ departure: values.departureId || undefined, guests: values.guests });
          const { pathname, search: current, hash } = window.location;
          const next = search ? `?${search}` : "";
          if (next !== current) window.history.replaceState(null, "", `${pathname}${next}${hash}`);
        },
      }),
    [form],
  );

  function selectDeparture(departureId: number) {
    applyTripDeparture(form, departureId, departures);
    // Màn hình rộng: thẻ đang dính bên phải nên "nearest" không cuộn. Điện thoại: thẻ nằm cuối trang → cuộn tới.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(TOUR_BOOKING_CARD_ID)
      ?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    // Focus vào ô ngày: trình đọc màn hình đọc lại ngày vừa chọn, bàn phím đi tiếp tới số khách và nút "Đặt tour".
    document.getElementById(tripDepartureFieldId(TOUR_BOOKING_CARD_ID))?.focus({ preventScroll: true });
  }

  return (
    <TourBookingContext value={{ departures, selectDeparture }}>
      <FormProvider {...form}>{children}</FormProvider>
    </TourBookingContext>
  );
}
