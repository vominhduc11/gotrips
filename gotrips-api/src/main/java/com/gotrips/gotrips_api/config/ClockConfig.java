package com.gotrips.gotrips_api.config;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Đồng hồ nghiệp vụ. "Hôm nay" (để lọc ngày khởi hành còn đặt được...) luôn tính theo giờ Việt Nam, khớp
 * {@code getTodayInVietnam} ở gotrips-web, không phụ thuộc múi giờ máy chủ (container thường chạy UTC: lệch
 * một ngày trong 7 giờ đầu của ngày mới).
 *
 * <p>Lấy "hôm nay" qua bean này (không gọi {@code LocalDate.now()} trần) để test cố định được ngày.
 */
@Configuration
public class ClockConfig {

    /** Múi giờ của nghiệp vụ (ngày khởi hành là ngày lịch ở Việt Nam). */
    public static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Bean
    Clock clock() {
        return Clock.system(BUSINESS_ZONE);
    }
}
