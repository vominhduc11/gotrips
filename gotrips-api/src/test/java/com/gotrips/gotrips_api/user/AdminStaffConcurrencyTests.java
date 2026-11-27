package com.gotrips.gotrips_api.user;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.support.BookingTestClient;
import com.gotrips.gotrips_api.support.CatalogApiTest;

@Transactional(propagation = Propagation.NOT_SUPPORTED)
class AdminStaffConcurrencyTests extends CatalogApiTest {

    @Test
    void concurrentDemotionAndRevocationCannotRemoveBothAdministrators() throws Exception {
        var client = new BookingTestClient(mvc, jdbc);
        var first = client.customer();
        var second = client.customer();
        var firstId = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", UUID.class, first.email());
        var secondId = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", UUID.class, second.email());

        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        try {
            jdbc.update("INSERT INTO user_roles (user_id, role_id) VALUES (?, 3), (?, 3)", firstId, secondId);
            var demote = pool.submit(() -> {
                ready.countDown();
                assertThat(start.await(10, TimeUnit.SECONDS)).isTrue();
                return client.send(HttpMethod.PUT, "/admin/staff/" + secondId + "/role", first.token(),
                        "{\"role\":\"STAFF\"}").andReturn().getResponse().getStatus();
            });
            var revoke = pool.submit(() -> {
                ready.countDown();
                assertThat(start.await(10, TimeUnit.SECONDS)).isTrue();
                return client.send(HttpMethod.DELETE, "/admin/staff/" + firstId + "/role", second.token(), null)
                        .andReturn().getResponse().getStatus();
            });
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            var statuses = List.of(demote.get(10, TimeUnit.SECONDS), revoke.get(10, TimeUnit.SECONDS));
            assertThat(statuses).contains(403);
            assertThat(statuses.stream().filter(code -> code == 200 || code == 204)).hasSize(1);
            assertThat(jdbc.queryForObject("""
                    SELECT count(*) FROM user_roles WHERE role_id = 3 AND user_id IN (?, ?)
                    """, Integer.class, firstId, secondId)).isEqualTo(1);
        } finally {
            start.countDown();
            pool.shutdownNow();
            jdbc.update("DELETE FROM users WHERE id IN (?, ?)", firstId, secondId);
        }
    }
}
