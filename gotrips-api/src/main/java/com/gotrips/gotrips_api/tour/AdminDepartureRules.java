package com.gotrips.gotrips_api.tour;

import java.time.LocalDate;

/**
 * Luật của chuyến ở trang quản trị, viết thành hàm thuần để kiểm thử từng trường hợp biên. Giao diện chỉ hiển thị theo
 * kết quả này, không tự suy ra.
 */
public final class AdminDepartureRules {

    static final long MAX_PRICE = 1_000_000_000_000L;
    static final int MAX_SEATS = 10_000;

    private AdminDepartureRules() {
    }

    /** Phần suy ra của một chuyến. */
    record View(Integer discountPercent, int remainingSeats, AdminDepartureState state, boolean editable,
            boolean dateEditable, boolean deletable) {
    }

    /**
     * @param hasBookings chuyến đã từng có đơn trong hệ thống, kể cả đơn đã huỷ. Đơn không chốt ngày khởi hành mà đọc
     *     từ chuyến, nên đổi ngày hay xoá chuyến sẽ làm sai đơn cũ. {@code bookedSeats > 0} cũng chặn như vậy: dữ liệu
     *     mẫu (và chỗ bán ngoài hệ thống) có chỗ đã đặt mà không có đơn.
     */
    static View view(TourDeparture departure, boolean hasBookings, boolean tourDeleted, LocalDate today) {
        int remaining = Math.max(0, departure.getTotalSeats() - departure.getBookedSeats());
        boolean upcoming = isUpcoming(departure, today);
        AdminDepartureState state = state(departure.getDepartureDate(), departure.isSalesClosed(),
                departure.getBookedSeats(), departure.getTotalSeats(), today);

        boolean editable = upcoming && !tourDeleted;
        boolean untouched = !everBooked(departure, hasBookings);
        Long original = departure.getOriginalPrice();
        Integer discount = original != null && original > departure.getPrice()
                ? TourCardCalculator.discountPercent(original, departure.getPrice())
                : null;

        return new View(discount, remaining, state, editable, editable && untouched, untouched && !tourDeleted);
    }

    /** Dùng chung với Tổng quan, nơi SQL chỉ trả các trường cần hiển thị của chuyến. */
    public static AdminDepartureState state(LocalDate date, boolean salesClosed, int booked, int total,
            LocalDate today) {
        return !date.isAfter(today) ? AdminDepartureState.PAST
                : salesClosed ? AdminDepartureState.CLOSED
                : booked >= total ? AdminDepartureState.SOLD_OUT
                : AdminDepartureState.UPCOMING;
    }

    /** Sau hôm nay: khớp luật đặt trực tuyến "từ ngày mai". */
    static boolean isUpcoming(TourDeparture departure, LocalDate today) {
        return departure.getDepartureDate().isAfter(today);
    }

    static boolean everBooked(TourDeparture departure, boolean hasBookings) {
        return hasBookings || departure.getBookedSeats() > 0;
    }
}
