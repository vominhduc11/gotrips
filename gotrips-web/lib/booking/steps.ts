import { MAX_GUESTS_PER_BOOKING, type BookingStep, type TripParams, type TripSelectionValues } from "@/lib/schemas/booking";
import type { TourDepartureView } from "@/lib/types";

type DepartureSeats = Pick<TourDepartureView, "id" | "seatsLeft" | "isSoldOut">;

/** Số khách tối đa của một chuyến: không quá số chỗ còn, không quá giới hạn mỗi đơn (chưa chọn chuyến: giới hạn đơn). */
export function getMaxGuests(departure: Pick<TourDepartureView, "seatsLeft"> | undefined): number {
  return Math.max(1, Math.min(MAX_GUESTS_PER_BOOKING, departure?.seatsLeft ?? MAX_GUESTS_PER_BOOKING));
}

/**
 * Lựa chọn (chuyến + số khách) mà URL yêu cầu, đã chuẩn hoá theo dữ liệu chuyến: chuyến không có/hết chỗ → chưa chọn
 * (`departureId = 0`); số khách vượt số chỗ còn → hạ xuống. URL là nguồn sự thật của lựa chọn này: form đặt tour lấy
 * giá trị từ đây cả lúc mở trang lẫn khi khách đến từ trang khác với `?departure=` mới.
 */
export function normalizeBookingSelection(params: TripParams, departures: DepartureSeats[]): TripSelectionValues {
  const departure = departures.find((d) => d.id === params.departure && !d.isSoldOut);
  return { departureId: departure?.id ?? 0, guests: Math.min(params.guests, getMaxGuests(departure)) };
}

/**
 * Đổi sang chuyến `departureId`, giữ số khách nếu chuyến mới còn đủ chỗ, không thì hạ xuống số chỗ còn.
 * Dùng chung cho ô chọn ngày, nút "Chọn ngày này" và hộp thoại "Thay đổi" để ba nơi cùng một luật.
 */
export function changeTripDeparture(
  current: TripSelectionValues,
  departureId: number,
  departures: DepartureSeats[],
): TripSelectionValues {
  const departure = departures.find((d) => d.id === departureId && !d.isSoldOut);
  if (!departure) return current;
  return { departureId: departure.id, guests: Math.min(current.guests, getMaxGuests(departure)) };
}

/**
 * Lựa chọn ban đầu của thẻ "Đặt tour" ở trang chi tiết: theo URL nếu URL ghi chuyến còn đặt được (khách quay lại để
 * đổi), không thì chọn sẵn chuyến gần nhất còn chỗ — khớp dòng "Ngày đi gần nhất" và để khách thấy ngay tổng tiền.
 * `departures` đã sắp theo ngày tăng dần. Tour hết chỗ mọi ngày → `departureId = 0`.
 */
export function resolveTripSelection(params: TripParams, departures: DepartureSeats[]): TripSelectionValues {
  const fromUrl = normalizeBookingSelection(params, departures);
  if (fromUrl.departureId !== 0) return fromUrl;
  const nearest = departures.find((d) => !d.isSoldOut);
  return { departureId: nearest?.id ?? 0, guests: Math.min(params.guests, getMaxGuests(nearest)) };
}

/**
 * Bước thực sự được hiển thị khi URL yêu cầu bước `requested`. URL ai cũng gõ được, nên không cho nhảy cóc: đòi
 * "Xác nhận" mà thông tin người đi chưa hợp lệ (vd vừa tải lại trang: dữ liệu form chỉ nằm trong bộ nhớ, không lưu lên
 * URL) → về "Thông tin". Thiếu chuyến hoặc chưa đăng nhập thì server đã chuyển hướng trước khi tới đây (`BookingGate`).
 * Wizard hiển thị bước này và sửa URL cho khớp (`replaceState`).
 */
export function resolveBookingStep(requested: BookingStep, state: { isDetailsValid: boolean }): BookingStep {
  if (requested === "xac-nhan" && !state.isDetailsValid) return "thong-tin";
  return requested;
}
