package com.gotrips.gotrips_api.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withNoContent;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;

import java.net.InetSocketAddress;
import java.util.ArrayDeque;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.transaction.event.TransactionalEventListenerFactory;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionSynchronizationUtils;
import org.springframework.web.client.RestClient;

import com.sun.net.httpserver.HttpServer;

class WebRevalidationTests {

    private static final String URL = "http://website.test/api/revalidate";
    private static final String SECRET = "test-only-secret";
    private final ArrayDeque<Runnable> queue = new ArrayDeque<>();
    private final AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext();
    private MockRestServiceServer web;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        web = MockRestServiceServer.bindTo(builder).build();
        context.register(TransactionalEventListenerFactory.class);
        context.registerBean(WebRevalidation.class, () -> new WebRevalidation(URL, SECRET, queue::add, builder.build()));
        context.refresh();
    }

    @AfterEach
    void close() {
        context.close();
    }

    @Test
    void sendsOnlyAfterCommitAndRunsTheHttpCallOutsideTheRequest() {
        web.expect(requestTo(URL)).andExpect(method(HttpMethod.POST))
                .andExpect(header("X-Gotrips-Revalidate-Secret", SECRET))
                .andExpect(content().json("""
                        {"tags":["tours","departures"]}"""))
                .andRespond(withNoContent());
        publish(TransactionSynchronization.STATUS_COMMITTED);
        assertThat(queue).hasSize(1);
        queue.remove().run();
        web.verify();
    }

    @Test
    void rollbackAndEventsOutsideTransactionsDoNotNotifyTheWebsite() {
        context.publishEvent(new WebCatalogChanged(List.of("tours")));
        publish(TransactionSynchronization.STATUS_ROLLED_BACK);
        assertThat(queue).isEmpty();
        web.verify();
    }

    @Test
    void webhookFailureIsHandledAfterTheTransaction() {
        web.expect(requestTo(URL)).andRespond(withServerError());
        publish(TransactionSynchronization.STATUS_COMMITTED);
        assertThatCode(queue.remove()::run).doesNotThrowAnyException();
        web.verify();
    }

    @Test
    void sendsOverHttp11WithoutAnH2cUpgrade() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        var requests = new AtomicInteger();
        var upgrade = new AtomicReference<String>();
        server.createContext("/api/revalidate", exchange -> {
            try {
                requests.incrementAndGet();
                upgrade.set(exchange.getRequestHeaders().getFirst("Upgrade"));
                if (upgrade.get() == null) {
                    exchange.getRequestBody().readAllBytes();
                    exchange.sendResponseHeaders(204, -1);
                }
            } finally {
                exchange.close();
            }
        });
        server.start();
        try {
            var revalidation = new WebRevalidation(
                    "http://127.0.0.1:" + server.getAddress().getPort() + "/api/revalidate", SECRET, Runnable::run);
            revalidation.afterCommit(new WebCatalogChanged(List.of("tours")));
            assertThat(requests.get()).isEqualTo(1);
            assertThat(upgrade.get()).isNull();
        } finally {
            server.stop(0);
        }
    }

    private void publish(int completionStatus) {
        TransactionSynchronizationManager.setActualTransactionActive(true);
        TransactionSynchronizationManager.initSynchronization();
        try {
            context.publishEvent(new WebCatalogChanged(List.of("tours", "departures")));
            assertThat(queue).isEmpty();
            TransactionSynchronizationUtils.invokeAfterCompletion(
                    TransactionSynchronizationManager.getSynchronizations(), completionStatus);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
            TransactionSynchronizationManager.setActualTransactionActive(false);
        }
    }
}
