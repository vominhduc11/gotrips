package com.gotrips.gotrips_api.payment;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

/**
 * Nhận webhook "có giao dịch mới" của SePay. Công khai ở {@code SecurityConfig} (SePay không có token của GoTrips);
 * thay vào đó mỗi request phải có chữ ký HMAC-SHA256 hợp lệ.
 *
 * <p>Đọc body thô thay cho {@code @RequestBody} vì chữ ký tính trên bytes gốc, và đọc có giới hạn để endpoint công khai
 * không bị dùng để đẩy body lớn vào bộ nhớ (một giao dịch SePay chỉ vài trăm byte). Ẩn khỏi OpenAPI: web và admin
 * không gọi endpoint này nên Orval không cần sinh client.
 */
@Hidden
@RestController
@RequiredArgsConstructor
public class SepayWebhookController {

    static final String PATH = "/payments/sepay/webhook";
    static final int MAX_BODY_BYTES = 32 * 1024;

    private final SepayWebhookService webhookService;

    @PostMapping(PATH)
    public SepayWebhookResponse receive(HttpServletRequest request,
            @RequestHeader(name = "X-SePay-Timestamp", required = false) String timestamp,
            @RequestHeader(name = "X-SePay-Signature", required = false) String signature) throws IOException {
        byte[] body = request.getInputStream().readNBytes(MAX_BODY_BYTES + 1);
        if (body.length > MAX_BODY_BYTES) {
            throw new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE, "Body webhook quá lớn.");
        }
        webhookService.receive(body, timestamp, signature);
        return SepayWebhookResponse.OK;
    }
}
