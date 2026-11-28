package com.gotrips.gotrips_api.payment;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Kiểm chữ ký HMAC-SHA256 của webhook SePay (hàm thuần). Theo tài liệu "Xác thực webhook" của SePay
 * (developer.sepay.vn/vi/sepay-webhooks/xac-thuc):
 *
 * <ul>
 *   <li>Header {@code X-SePay-Timestamp}: Unix timestamp (giây) lúc ký.
 *   <li>Header {@code X-SePay-Signature}: {@code sha256=<hex>}, với hex = HMAC-SHA256(Secret Key,
 *       {@code "<timestamp>.<raw body>"}).
 *   <li>Ký trên BYTES GỐC của body, nên phải kiểm trước khi parse JSON (parse rồi serialize lại có thể ra chuỗi khác).
 * </ul>
 *
 * Chữ ký lệch quá {@link #TOLERANCE} so với giờ máy chủ bị từ chối để không phát lại được request cũ (mẫu của SePay dùng
 * ±5 phút). Lần gửi lại của SePay ký lại với timestamp mới nên không bị ảnh hưởng.
 */
final class SepaySignature {

    static final Duration TOLERANCE = Duration.ofMinutes(5);

    private static final String PREFIX = "sha256=";
    private static final String ALGORITHM = "HmacSHA256";

    private SepaySignature() {
    }

    static boolean isValid(String secret, String timestampHeader, String signatureHeader, byte[] body, Instant now) {
        if (secret == null || secret.isBlank() || timestampHeader == null || signatureHeader == null) {
            return false;
        }
        long timestamp;
        try {
            timestamp = Long.parseLong(timestampHeader.strip());
        } catch (NumberFormatException e) {
            return false;
        }
        if (Math.abs(now.getEpochSecond() - timestamp) > TOLERANCE.toSeconds()) {
            return false;
        }
        String given = signatureHeader.strip().toLowerCase(Locale.ROOT);
        String expected = PREFIX + sign(secret, timestamp, body);
        // So sánh thời gian hằng: không để lộ chữ ký đúng qua thời gian phản hồi.
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),
                given.getBytes(StandardCharsets.US_ASCII));
    }

    /** Hex chữ thường của HMAC-SHA256(secret, "timestamp.body"). Dùng chung cho test dựng request hợp lệ. */
    static String sign(String secret, long timestamp, byte[] body) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), ALGORITHM));
            mac.update((timestamp + ".").getBytes(StandardCharsets.US_ASCII));
            return HexFormat.of().formatHex(mac.doFinal(body));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            // JDK nào cũng có HmacSHA256 và khoá không rỗng luôn hợp lệ: tới đây là lỗi môi trường.
            throw new IllegalStateException("Không tính được HMAC-SHA256.", e);
        }
    }
}
