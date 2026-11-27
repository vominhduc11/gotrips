package com.gotrips.gotrips_api.booking;

/**
 * Hằng số validate dùng chung của các request đặt chỗ. Câu chữ và giới hạn khớp các schema Zod của gotrips-web
 * ({@code lib/schemas/booking.ts}, {@code hotel-booking.ts}, {@code flight-booking.ts}): đổi một nơi phải đổi nơi kia.
 *
 * <p>Các {@code @Pattern} đều chấp nhận chuỗi rỗng: ô để trống chỉ báo MỘT lỗi của {@code @NotBlank} (nếu không web
 * nhận hai lỗi cho cùng ô và thứ tự không cố định).
 */
final class BookingValidation {

    /** Ít nhất 2 ký tự (hoặc rỗng). */
    static final String NAME_MIN_LENGTH = "(?s)|.{2,}";
    static final int NAME_MAX_LENGTH = 100;
    static final String NAME_MIN_MESSAGE = "Họ và tên cần có ít nhất 2 ký tự.";
    static final String NAME_MAX_MESSAGE = "Họ và tên không được quá 100 ký tự.";

    /** Cùng định dạng với đăng ký nhận ưu đãi (không dùng {@code @Email} vì chấp nhận {@code a@b}). */
    static final String EMAIL = "|[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}";

    /** Di động Việt Nam: 0 hoặc +84, đầu số 3/5/7/8/9, rồi 8 chữ số; được cách nhóm bằng dấu cách hoặc chấm. */
    static final String VIETNAM_PHONE = "|(?:\\+84|0)[35789](?:[ .]?\\d){8}";

    static final int NOTE_MAX_LENGTH = 500;
    static final String NOTE_MAX_MESSAGE = "Ghi chú không được quá 500 ký tự.";

    static final int MAX_TOUR_GUESTS = 10;
    static final String TOUR_GUESTS_MESSAGE = "Số khách phải từ 1 đến 10.";
    static final String TRAVELER_COUNT_MESSAGE = "Số người đi phải bằng số khách đã chọn.";

    private BookingValidation() {
    }

    static String strip(String value) {
        return value == null ? null : value.strip();
    }

    /** Ghi chú trống thì coi như không có. */
    static String stripToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
