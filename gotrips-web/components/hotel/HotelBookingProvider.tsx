"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createContext, useContext, useEffect, useLayoutEffect, type ReactNode } from "react";
import { FormProvider, useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { changeHotelRoom, resolveHotelStay } from "@/lib/booking/hotel-stay";
import {
  buildHotelStaySearch,
  createHotelStaySchema,
  DEFAULT_HOTEL_GUESTS,
  DEFAULT_HOTEL_ROOMS,
  HOTEL_BOOKING_CARD_ID,
  parseHotelStayParams,
  type HotelStayValues,
} from "@/lib/schemas/hotel-booking";
import type { HotelRoomTypeView } from "@/lib/types";

/** `id` của ô chọn loại phòng trong thẻ "Đặt phòng" (nút "Chọn phòng này" đưa focus tới đây). */
export const HOTEL_ROOM_FIELD_ID = `${HOTEL_BOOKING_CARD_ID}-phong`;

type HotelBookingContextValue = {
  roomTypes: HotelRoomTypeView[];
  /** Chọn loại phòng từ danh sách phòng: đổi lựa chọn trong thẻ "Đặt phòng" rồi đưa khách tới ô loại phòng của thẻ. */
  selectRoom: (roomTypeId: number) => void;
};

const HotelBookingContext = createContext<HotelBookingContextValue | null>(null);

export function useHotelBooking(): HotelBookingContextValue {
  const value = useContext(HotelBookingContext);
  if (!value) throw new Error("useHotelBooking phải được dùng bên trong <HotelBookingProvider>.");
  return value;
}

/** Đổi loại phòng theo đúng luật `changeHotelRoom` (tự tăng số phòng khi cần) — dùng cho ô chọn phòng lẫn nút "Chọn". */
export function applyHotelRoom(
  form: Pick<UseFormReturn<HotelStayValues>, "getValues" | "setValue">,
  roomTypeId: number,
  roomTypes: HotelRoomTypeView[],
) {
  const next = changeHotelRoom(form.getValues(), roomTypeId, roomTypes);
  form.setValue("roomTypeId", next.roomTypeId, { shouldDirty: true });
  form.setValue("rooms", next.rooms, { shouldDirty: true });
}

/**
 * Lựa chọn lưu trú của trang chi tiết khách sạn: MỘT form React Hook Form dùng chung cho thẻ "Đặt phòng" và các nút
 * "Chọn phòng này" ở danh sách phòng (hai nơi xa nhau trong cây nên form nằm ở provider bọc cả hai). Cùng cách với
 * `TourBookingProvider`:
 *  - KHÔNG dùng `useSearchParams` (sẽ làm trang mất static shell). URL → form: đọc `window.location` sau khi mount (cả khi
 *    Next hiện lại trang đang ẩn bằng `<Activity>`), nên liên kết từ kết quả tìm kiếm / từ trang đặt phòng điền sẵn được.
 *  - form → URL: khách đổi lựa chọn thì `replaceState`, để tải lại trang hoặc bấm Back từ trang đặt phòng vẫn giữ.
 */
export function HotelBookingProvider({ roomTypes, children }: { roomTypes: HotelRoomTypeView[]; children: ReactNode }) {
  const form = useForm<HotelStayValues>({
    // Dựng schema MỖI LẦN validate để "hôm nay" luôn đúng (không đọc "hôm nay" lúc render).
    resolver: ((values, context, options) =>
      zodResolver(createHotelStaySchema(roomTypes))(values, context, options)) as Resolver<HotelStayValues>,
    // HTML prerender: phòng rẻ nhất đủ chỗ cho 2 khách, chưa có ngày; URL (nếu có) được áp ngay sau khi mount.
    defaultValues: resolveHotelStay(
      { room: undefined, checkIn: undefined, checkOut: undefined, guests: DEFAULT_HOTEL_GUESTS, rooms: DEFAULT_HOTEL_ROOMS },
      roomTypes,
    ),
  });

  // useLayoutEffect: áp lựa chọn trên URL trước khi trình duyệt vẽ, tránh nháy từ giá trị mặc định.
  useLayoutEffect(() => {
    const params = parseHotelStayParams(Object.fromEntries(new URLSearchParams(window.location.search)));
    const stay = resolveHotelStay(params, roomTypes);
    for (const key of ["roomTypeId", "checkIn", "checkOut", "guests", "rooms"] as const) {
      form.setValue(key, stay[key]);
    }
  }, [roomTypes, form]);

  // Khai báo SAU effect đọc URL: lần áp URL lúc mount không bị ghi ngược lại. `subscribe` hợp với React Compiler.
  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: ({ values }) => {
          const search = buildHotelStaySearch({
            room: values.roomTypeId || undefined,
            checkIn: values.checkIn || undefined,
            checkOut: values.checkOut || undefined,
            guests: values.guests,
            rooms: values.rooms,
          });
          const { pathname, search: current, hash } = window.location;
          const next = search ? `?${search}` : "";
          if (next !== current) window.history.replaceState(null, "", `${pathname}${next}${hash}`);
        },
      }),
    [form],
  );

  function selectRoom(roomTypeId: number) {
    applyHotelRoom(form, roomTypeId, roomTypes);
    if (form.formState.isSubmitted) void form.trigger();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(HOTEL_BOOKING_CARD_ID)
      ?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    document.getElementById(HOTEL_ROOM_FIELD_ID)?.focus({ preventScroll: true });
  }

  return (
    <HotelBookingContext value={{ roomTypes, selectRoom }}>
      <FormProvider {...form}>{children}</FormProvider>
    </HotelBookingContext>
  );
}
