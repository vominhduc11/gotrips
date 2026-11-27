package com.gotrips.gotrips_api.config;

import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("seed")
public class SeedAdminNotice {

    @Bean
    ApplicationRunner logSeedAdminNotice() {
        return args -> LoggerFactory.getLogger(SeedAdminNotice.class)
                .warn("Profile seed có tài khoản quản trị thử nghiệm. Chỉ dùng profile này ở môi trường phát triển.");
    }
}
