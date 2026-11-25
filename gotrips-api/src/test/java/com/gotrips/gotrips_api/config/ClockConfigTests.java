package com.gotrips.gotrips_api.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

class ClockConfigTests {

    @Test
    void businessClockUsesVietnamTime() {
        Clock clock = new ClockConfig().clock();

        assertThat(clock.getZone()).isEqualTo(ZoneId.of("Asia/Ho_Chi_Minh"));
    }

    @Test
    void todayRollsOverAtVietnamMidnightNotUtcMidnight() {
        // 18:30 UTC ngày 24/11 = 01:30 ngày 25/11 giờ Việt Nam.
        Clock fixed = Clock.fixed(Instant.parse("2026-11-24T18:30:00Z"), ClockConfig.BUSINESS_ZONE);

        assertThat(LocalDate.now(fixed)).isEqualTo(LocalDate.of(2026, 11, 25));
        assertThat(LocalDate.now(Clock.fixed(Instant.parse("2026-11-24T18:30:00Z"), ZoneOffset.UTC)))
                .isEqualTo(LocalDate.of(2026, 11, 24));
    }
}
