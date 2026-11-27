package com.gotrips.gotrips_api.catalog;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
class WebRevalidation {

    private final String url;
    private final String secret;
    private final Executor executor;
    private final RestClient client;

    @Autowired
    WebRevalidation(@Value("${gotrips.web-revalidation.url}") String url,
            @Value("${gotrips.web-revalidation.secret}") String secret,
            @Qualifier("webRevalidationExecutor") Executor executor) {
        this(url, secret, executor, createClient());
    }

    WebRevalidation(String url, String secret, Executor executor, RestClient client) {
        this.url = url;
        this.secret = secret;
        this.executor = executor;
        this.client = client;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void afterCommit(WebCatalogChanged event) {
        if (url.isBlank()) {
            return;
        }
        if (secret.isBlank()) {
            log.warn("Bỏ qua làm mới cache website vì thiếu GOTRIPS_REVALIDATE_SECRET.");
            return;
        }
        try {
            // Mạng có thể chậm hoặc mất kết nối sau commit. Không để request admin chờ webhook.
            executor.execute(() -> notifyWeb(event));
        } catch (RejectedExecutionException error) {
            log.warn("Bỏ qua làm mới cache website vì hàng đợi đã đầy.");
        }
    }

    private void notifyWeb(WebCatalogChanged event) {
        try {
            client.post().uri(url).contentType(MediaType.APPLICATION_JSON)
                    .header("X-Gotrips-Revalidate-Secret", secret)
                    .body(event).retrieve().toBodilessEntity();
        } catch (RestClientResponseException error) {
            log.warn("Website từ chối làm mới cache (HTTP {}).", error.getStatusCode().value());
        } catch (RestClientException | IllegalArgumentException error) {
            // Ngoại lệ HTTP có thể chứa URL hoặc dữ liệu gửi đi.
            log.warn("Không gọi được webhook làm mới cache website ({}).", error.getClass().getSimpleName());
        }
    }

    private static RestClient createClient() {
        // Máy chủ HTTP của Next.js trong Compose đóng kết nối khi JDK yêu cầu nâng cấp h2c.
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(1)).build());
        factory.setReadTimeout(Duration.ofSeconds(2));
        return RestClient.builder().requestFactory(factory).build();
    }

    @Configuration(proxyBeanMethods = false)
    static class RevalidationExecutorConfig {

        @Bean(defaultCandidate = false)
        ThreadPoolTaskExecutor webRevalidationExecutor() {
            var executor = new ThreadPoolTaskExecutor();
            executor.setThreadNamePrefix("web-revalidate-");
            executor.setCorePoolSize(1);
            executor.setMaxPoolSize(2);
            executor.setQueueCapacity(50);
            return executor;
        }
    }
}
