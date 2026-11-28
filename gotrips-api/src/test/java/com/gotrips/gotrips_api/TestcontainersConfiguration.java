package com.gotrips.gotrips_api;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import com.gotrips.gotrips_api.config.ClockConfig;

/**
 * Chạy PostgreSQL thật bằng Docker trong test (không dùng H2).
 * Cùng phiên bản 17 với docker-compose. {@code @ServiceConnection} tự nối datasource
 * vào container, nên test không cần DB local. Yêu cầu Docker đang chạy.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgresContainer() {
        return new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));
    }

    /**
     * Khoá ký JWT và tài khoản nhận chuyển khoản chỉ dùng cho test (application.yaml cố ý không có giá trị mặc định cho
     * chúng). Đặt ở đây để mọi test import cấu hình này đều có sẵn, và chia sẻ chung một application context.
     */
    @Bean
    DynamicPropertyRegistrar requiredTestProperties() {
        return registry -> {
            registry.add("gotrips.jwt.secret", () -> "chi-dung-cho-test-khong-dung-o-moi-truong-that-0123456789");
            registry.add("gotrips.payment.bank-transfer.bank-name", () -> "Ngân hàng Test");
            registry.add("gotrips.payment.bank-transfer.account-number", () -> "1234 5678");
            registry.add("gotrips.payment.bank-transfer.account-name", () -> "CONG TY TEST");
            registry.add("gotrips.payment.bank-transfer.qr-bank-code", () -> "VCB");
            registry.add("gotrips.payment.sepay.webhook-secret", () -> SEPAY_WEBHOOK_SECRET);
        };
    }

    /** Secret Key HMAC của webhook SePay trong test; test ký request bằng khoá này. */
    public static final String SEPAY_WEBHOOK_SECRET = "chi-dung-cho-test-webhook-sepay-0123456789";

    /** Thời điểm cố định của mọi test: 01:30 sáng 25/11/2026 giờ Việt Nam (lúc đó theo UTC vẫn là 24/11). */
    public static final Instant NOW = Instant.parse("2026-11-24T18:30:00Z");

    /** "Hôm nay" theo giờ Việt Nam ứng với {@link #NOW}. */
    public static final LocalDate TODAY = LocalDate.of(2026, 11, 25);

    /**
     * Đồng hồ cố định để test các trường phụ thuộc "hôm nay" (ngày khởi hành còn đặt được...) không đổi theo thời
     * gian chạy. {@code @Primary} để thắng bean {@code clock} thật. Đặt ở đây (không ở từng test) để mọi test dùng
     * chung MỘT application context, tránh dựng thêm container PostgreSQL. {@code JwtService} gọi
     * {@code Instant.now()} trực tiếp nên không bị ảnh hưởng.
     */
    @Bean
    @Primary
    Clock fixedClock() {
        return Clock.fixed(NOW, ClockConfig.BUSINESS_ZONE);
    }
}
