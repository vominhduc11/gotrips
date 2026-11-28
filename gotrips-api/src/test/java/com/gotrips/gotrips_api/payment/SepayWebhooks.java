package com.gotrips.gotrips_api.payment;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.nio.charset.StandardCharsets;

import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.gotrips.gotrips_api.TestcontainersConfiguration;

/** Dựng body webhook SePay và gửi kèm chữ ký HMAC đúng như SePay (dùng chung cho các test của gói payment). */
final class SepayWebhooks {

    static final String PATH = SepayWebhookController.PATH;
    /** Số tài khoản nhận của test ("1234 5678" ở TestcontainersConfiguration) như SePay gửi: không khoảng trắng. */
    static final String ACCOUNT = "12345678";
    static final long NOW_SECONDS = TestcontainersConfiguration.NOW.getEpochSecond();

    private SepayWebhooks() {
    }

    /** Giao dịch tiền vào hợp lệ; {@code code} null = SePay không tách được mã. */
    static String incoming(long id, long amount, String content, String code) {
        return payload(id, amount, content, code, ACCOUNT, "in");
    }

    static String payload(long id, long amount, String content, String code, String accountNumber,
            String transferType) {
        return """
                {"id":%d,"gateway":"Vietcombank","transactionDate":"2026-11-25 01:29:12","accountNumber":"%s",\
                "subAccount":"","code":%s,"content":"%s","transferType":"%s","description":"BankAPINotify %s",\
                "transferAmount":%d,"accumulated":105000000,"referenceCode":"FT2611250%d"}"""
                .formatted(id, accountNumber, code == null ? "null" : "\"" + code + "\"", content, transferType,
                        content, amount, id);
    }

    static ResultActions send(MockMvc mvc, String body) throws Exception {
        return send(mvc, body, NOW_SECONDS, TestcontainersConfiguration.SEPAY_WEBHOOK_SECRET);
    }

    static ResultActions send(MockMvc mvc, String body, long timestamp, String secret) throws Exception {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        return mvc.perform(post(PATH).contentType(MediaType.APPLICATION_JSON).content(bytes)
                .header("X-SePay-Timestamp", String.valueOf(timestamp))
                .header("X-SePay-Signature", "sha256=" + SepaySignature.sign(secret, timestamp, bytes)));
    }
}
