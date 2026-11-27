package com.gotrips.gotrips_api.booking;

import java.security.SecureRandom;
import java.util.function.Predicate;
import java.util.function.Supplier;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

/**
 * Mã đơn dễ đọc: "GT" + 6 ký tự, ví dụ "GT7K4Q2M". Mã cũng là NỘI DUNG CHUYỂN KHOẢN nên chỉ có chữ in hoa và số (nhiều
 * app ngân hàng tự bỏ ký tự đặc biệt), và bỏ các ký tự dễ đọc nhầm khi gõ lại: 0/O, 1/I/L. 31 ký tự × 6 vị trí ≈ 887
 * triệu tổ hợp. Định dạng khớp {@code lib/booking/booking-code-format.ts} của gotrips-web và CHECK ở migration V5.
 */
@Component
public class BookingCodeGenerator {

    static final String ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    static final Pattern PATTERN = Pattern.compile("GT[2-9A-HJKMNP-Z]{6}");
    private static final int RANDOM_LENGTH = 6;
    private static final int MAX_ATTEMPTS = 20;

    private final SecureRandom random = new SecureRandom();

    public String next() {
        StringBuilder code = new StringBuilder("GT");
        for (int i = 0; i < RANDOM_LENGTH; i++) {
            code.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return code.toString();
    }

    public static boolean isValid(String code) {
        return code != null && PATTERN.matcher(code).matches();
    }

    /**
     * Sinh mã chưa dùng: trùng thì sinh lại. Đây chỉ là bước kiểm trước; ràng buộc UNIQUE của DB mới là chốt chặn khi
     * hai request cùng sinh một mã (xem {@link BookingTransaction}).
     */
    static String unique(Supplier<String> generator, Predicate<String> alreadyUsed) {
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            String code = generator.get();
            if (!alreadyUsed.test(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Không sinh được mã đơn chưa dùng sau " + MAX_ATTEMPTS + " lần.");
    }
}
