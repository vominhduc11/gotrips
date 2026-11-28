package com.gotrips.gotrips_api.payment;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;

import org.springframework.stereotype.Service;

import com.gotrips.gotrips_api.common.error.InvalidRequestException;
import com.gotrips.gotrips_api.common.error.ResourceNotFoundException;
import com.gotrips.gotrips_api.common.error.UnauthorizedException;
import com.gotrips.gotrips_api.config.ClockConfig;
import com.gotrips.gotrips_api.config.SepayProperties;

import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

/**
 * Xác thực rồi ghi nhận webhook SePay. Thứ tự: tắt → 404; sai chữ ký → 401 (SePay ghi thất bại, không có gì được
 * ghi); body sai → 400; tiền ra → bỏ qua; còn lại ghi giao dịch (trùng thì bỏ qua). Mọi trường hợp ghi nhận được hay
 * bỏ qua có chủ đích đều trả {@code {"success": true}} để SePay không gửi lại.
 *
 * <p>Parse và validate bằng tay (vẫn theo annotation trên {@link SepayWebhookPayload}) vì phải kiểm chữ ký trên body
 * thô TRƯỚC khi đọc JSON, nên không dùng {@code @Valid @RequestBody} được. Log chỉ ghi id giao dịch và kết quả, không
 * ghi nội dung chuyển khoản (có tên người chuyển) hay số tài khoản.
 */
@Slf4j
@Service
@RequiredArgsConstructor
class SepayWebhookService {

    private static final DateTimeFormatter TRANSACTION_DATE = DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm:ss")
            .withResolverStyle(ResolverStyle.STRICT);

    private final SepayProperties sepay;
    private final ObjectMapper json;
    private final Validator validator;
    private final BankTransactionService transactions;
    private final Clock clock;

    void receive(byte[] body, String timestamp, String signature) {
        if (!sepay.webhookEnabled()) {
            throw new ResourceNotFoundException("Chưa bật nhận webhook SePay.");
        }
        if (!SepaySignature.isValid(sepay.webhookSecret(), timestamp, signature, body, clock.instant())) {
            log.warn("Từ chối webhook SePay: thiếu hoặc sai chữ ký, hoặc timestamp lệch quá {} phút.",
                    SepaySignature.TOLERANCE.toMinutes());
            throw new UnauthorizedException("Chữ ký webhook không hợp lệ.");
        }
        SepayWebhookPayload payload = parse(body);
        if (!payload.incoming()) {
            log.debug("Bỏ qua giao dịch SePay {}: tiền ra.", payload.id());
            return;
        }
        transactions.record(payload, transactionAt(payload.transactionDate()));
    }

    private SepayWebhookPayload parse(byte[] body) {
        SepayWebhookPayload payload;
        try {
            payload = json.readValue(body, SepayWebhookPayload.class);
        } catch (JacksonException e) {
            log.warn("Webhook SePay có chữ ký đúng nhưng body không phải JSON hợp lệ.");
            throw new InvalidRequestException("body", "Body webhook phải là JSON theo định dạng của SePay.");
        }
        if (payload == null) {
            throw new InvalidRequestException("body", "Body webhook phải là JSON theo định dạng của SePay.");
        }
        var violations = validator.validate(payload);
        if (!violations.isEmpty()) {
            log.warn("Webhook SePay có chữ ký đúng nhưng thiếu hoặc sai {} trường.", violations.size());
            throw new ConstraintViolationException(violations);
        }
        return payload;
    }

    /** {@code transactionDate} là giờ Việt Nam không kèm múi giờ. */
    private static Instant transactionAt(String transactionDate) {
        try {
            return LocalDateTime.parse(transactionDate, TRANSACTION_DATE).atZone(ClockConfig.BUSINESS_ZONE).toInstant();
        } catch (DateTimeParseException e) {
            throw new InvalidRequestException("transactionDate", "Thời điểm giao dịch không phải ngày giờ hợp lệ.");
        }
    }
}
