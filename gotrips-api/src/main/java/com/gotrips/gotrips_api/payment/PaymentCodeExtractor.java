package com.gotrips.gotrips_api.payment;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Tìm mã đơn trong một giao dịch (hàm thuần). Mã đơn = "GT" + 6 ký tự (xem {@code BookingCodeGenerator}).
 *
 * <p>Ưu tiên trường {@code code} mà SePay đã tách theo "Cấu trúc mã thanh toán" (cấu hình tiền tố GT, hậu tố 6 ký tự
 * "Số và chữ"). SePay có thể không tách được (chưa cấu hình, hoặc khách viết mã dính liền chữ khác), nên quét thêm
 * NGUYÊN VĂN nội dung: ngân hàng hay chèn tiền tố/hậu tố hoặc bỏ khoảng trắng ("MBVCB.123.GT7K4Q2M.CT tu...",
 * "GT7K4Q2MNGUYEN VAN A"), vì vậy không đòi ranh giới từ. Quét mọi vị trí có "GT" (kể cả chồng nhau, như "GTGT7K4Q2M")
 * và để lớp gọi chọn mã đầu tiên là đơn có thật: chuỗi 8 ký tự ngẫu nhiên trùng mã của một đơn khác là gần như không
 * thể.
 */
final class PaymentCodeExtractor {

    /** Cùng bảng chữ với CHECK {@code ck_bookings_code_format} ở V5 (bỏ 0/O, 1/I/L). */
    private static final Pattern BOOKING_CODE = Pattern.compile("GT[2-9A-HJKMNP-Z]{6}");
    private static final int CODE_LENGTH = 8;

    private PaymentCodeExtractor() {
    }

    /** Mã ứng viên theo thứ tự ưu tiên, không trùng; có thể rỗng. */
    static List<String> candidates(String sepayCode, String content) {
        Set<String> codes = new LinkedHashSet<>();
        if (sepayCode != null) {
            String code = sepayCode.strip().toUpperCase(Locale.ROOT);
            if (BOOKING_CODE.matcher(code).matches()) {
                codes.add(code);
            }
        }
        if (content != null) {
            String text = content.toUpperCase(Locale.ROOT);
            for (int at = text.indexOf("GT"); at >= 0 && at + CODE_LENGTH <= text.length();
                    at = text.indexOf("GT", at + 1)) {
                String window = text.substring(at, at + CODE_LENGTH);
                if (BOOKING_CODE.matcher(window).matches()) {
                    codes.add(window);
                }
            }
        }
        return List.copyOf(codes);
    }
}
