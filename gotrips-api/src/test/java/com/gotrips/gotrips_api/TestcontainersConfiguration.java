package com.gotrips.gotrips_api;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Chạy PostgreSQL thật bằng Docker trong test (không dùng H2).
 * Cùng phiên bản 17 với docker-compose. {@code @ServiceConnection} tự nối datasource
 * vào container, nên test không cần DB local. Yêu cầu Docker đang chạy.
 */
@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgresContainer() {
        return new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));
    }
}
