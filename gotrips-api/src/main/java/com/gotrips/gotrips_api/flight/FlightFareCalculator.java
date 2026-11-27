package com.gotrips.gotrips_api.flight;

import java.time.LocalTime;

/**
 * Giá vé theo hạng ghế và loại hành khách, giờ hạ cánh: hàm thuần nên test được trực tiếp. Đây là NƠI DUY NHẤT tính
 * các giá trị này (web chỉ cộng tạm tính từ giá API trả về).
 *
 * <ul>
 *   <li>Giá người lớn = giá phổ thông × hệ số hạng ghế (1 / 1,6 / 2,8 / 4,2), làm tròn tới nghìn đồng.
 *   <li>Trẻ em (2 đến dưới 12 tuổi) = 75% giá người lớn; em bé (dưới 2 tuổi) = 10%; cùng làm tròn tới nghìn đồng.
 * </ul>
 *
 * Tính bằng số nguyên và làm tròn nửa lên (như {@code Math.round} với số dương) để không sai lệch vì số thực.
 */
public final class FlightFareCalculator {

    private static final long CHILD_PERCENT = 75;
    private static final long INFANT_PERCENT = 10;
    private static final int MINUTES_PER_DAY = 24 * 60;

    private FlightFareCalculator() {
    }

    /** Giờ hạ cánh theo giờ địa phương; {@code nextDay}: hạ cánh sang ngày hôm sau ("+1 ngày"). */
    public record Arrival(LocalTime time, boolean nextDay) {
    }

    /** Hệ số giá của hạng ghế so với hạng phổ thông, tính theo phần trăm. */
    static long cabinPercent(CabinClass cabin) {
        return switch (cabin) {
            case ECONOMY -> 100;
            case PREMIUM_ECONOMY -> 160;
            case BUSINESS -> 280;
            case FIRST -> 420;
        };
    }

    public static FlightFaresResponse fares(long economyFare, CabinClass cabin) {
        long adult = percentRoundedToThousand(economyFare, cabinPercent(cabin));
        return new FlightFaresResponse(adult, percentRoundedToThousand(adult, CHILD_PERCENT),
                percentRoundedToThousand(adult, INFANT_PERCENT));
    }

    /** {@code amount × percent%}, làm tròn nửa lên tới nghìn đồng (giá vé không có số lẻ dưới 1.000 ₫). */
    private static long percentRoundedToThousand(long amount, long percent) {
        long hundredths = amount * percent;
        long unit = 1000 * 100;
        return Math.floorDiv(hundredths + unit / 2, unit) * 1000;
    }

    /** Chỉ hỗ trợ chuyến dưới 24 giờ (DB có CHECK), đủ cho chuyến nội địa. */
    public static Arrival arrival(LocalTime departTime, int durationMinutes) {
        int totalMinutes = departTime.getHour() * 60 + departTime.getMinute() + durationMinutes;
        return new Arrival(departTime.plusMinutes(durationMinutes), totalMinutes >= MINUTES_PER_DAY);
    }
}
