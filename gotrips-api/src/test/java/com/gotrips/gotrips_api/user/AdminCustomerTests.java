package com.gotrips.gotrips_api.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

import com.gotrips.gotrips_api.support.BookingApiTest;

class AdminCustomerTests extends BookingApiTest {

    private static final String PATH = "/admin/customers";
    private static final OffsetDateTime DATE = OffsetDateTime.parse("2026-11-23T10:00:00Z");
    private static final UUID FIRST = UUID.fromString("12345678-0000-4000-8000-000000000001");
    private static final UUID SECOND = UUID.fromString("12345678-0000-4000-8000-000000000002");
    private static final UUID THIRD = UUID.fromString("12345678-0000-4000-8000-000000000003");
    private static final UUID STAFF_ONLY = UUID.fromString("12345678-0000-4000-8000-000000000004");
    private static final UUID ADMIN_ONLY = UUID.fromString("12345678-0000-4000-8000-000000000005");

    @Test
    void aggregatesAllOrdersButOnlyNonCancelledPaidPayments() throws Exception {
        var staff = client.staff();
        account(FIRST, "Hồ sơ% An", 1, 2, 3);
        account(SECOND, "Hồ sơ Bình", 1);
        account(STAFF_ONLY, "Hồ sơ nhân viên", 2);
        account(ADMIN_ONLY, "Hồ sơ quản trị", 3);
        booking(FIRST, "GT555552", "CONFIRMED", "PAID", 200, DATE);
        booking(FIRST, "GT555553", "PENDING", "UNPAID", 300, DATE.plusDays(1));
        booking(FIRST, "GT555554", "CANCELLED", "PAID", 400, DATE.plusDays(2));
        booking(SECOND, "GT555555", "PENDING", "PAID", 100, DATE);

        mvc.perform(get(PATH).param("q", "  HỒ SƠ ").param("sort", "PAID_DESC")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + staff.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.items[0].id").value(FIRST.toString()))
                .andExpect(jsonPath("$.items[0].bookingCount").value(3))
                .andExpect(jsonPath("$.items[0].totalPaid").value(200))
                .andExpect(jsonPath("$.items[0].lastBookingAt").value("2026-11-25T10:00:00Z"))
                .andExpect(jsonPath("$.items[1].totalPaid").value(100));

        mvc.perform(get(PATH).param("q", "%").header(HttpHeaders.AUTHORIZATION, "Bearer " + staff.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1));
        getAs(PATH + "/" + FIRST, staff).andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingCount").value(3))
                .andExpect(jsonPath("$.totalPaid").value(200));
    }

    @Test
    void customersWithoutBookingsHaveZerosAndNullAndNonCustomersAreNotFound() throws Exception {
        var staff = client.staff();
        account(FIRST, "Hồ sơ An", 1);
        account(STAFF_ONLY, "Nhân viên", 2);
        account(ADMIN_ONLY, "Quản trị", 3);
        getAs(PATH + "/" + FIRST, staff).andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingCount").value(0))
                .andExpect(jsonPath("$.totalPaid").value(0))
                .andExpect(jsonPath("$.lastBookingAt").hasJsonPath())
                .andExpect(jsonPath("$.lastBookingAt").value((Object) null));
        getAs(PATH + "/" + STAFF_ONLY, staff).andExpect(status().isNotFound());
        getAs(PATH + "/" + ADMIN_ONLY, staff).andExpect(status().isNotFound());
        getAs(PATH + "/" + UUID.randomUUID(), staff).andExpect(status().isNotFound());
    }

    @Test
    void sortsWithStableTiesAndClampsPageIncludingAnEmptySearch() throws Exception {
        var staff = client.staff();
        account(FIRST, "Hồ sơ An", 1);
        account(SECOND, "Hồ sơ an", 1);
        account(THIRD, "Hồ sơ Bình", 1);
        for (var entry : Map.of("CREATED_DESC", THIRD, "PAID_DESC", THIRD, "NAME_ASC", FIRST).entrySet()) {
            mvc.perform(get(PATH).param("q", "Hồ sơ").param("size", "1").param("sort", entry.getKey())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + staff.token()))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.size").value(1))
                    .andExpect(jsonPath("$.totalPages").value(3))
                    .andExpect(jsonPath("$.items[0].id").value(entry.getValue().toString()));
        }
        mvc.perform(get(PATH).param("q", "Hồ sơ").param("size", "1").param("page", "99")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + staff.token()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.page").value(3))
                .andExpect(jsonPath("$.items[0].id").value(FIRST.toString()));
        mvc.perform(get(PATH).param("q", "KHONG-CO").param("page", "99")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + staff.token()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalPages").value(1)).andExpect(jsonPath("$.items").isEmpty());
        mvc.perform(get(PATH).param("q", FIRST.toString().toUpperCase(java.util.Locale.ROOT))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + staff.token()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1));
    }

    @Test
    void rejectsInvalidFiltersAndRequiresAStaffRole() throws Exception {
        var customer = client.customer();
        var staff = client.staff();
        getAs(PATH, null).andExpect(status().isUnauthorized());
        getAs(PATH, customer).andExpect(status().isForbidden());
        getAs(PATH + "/" + FIRST, customer).andExpect(status().isForbidden());
        mvc.perform(get(PATH).param("size", "101").param("page", "0")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + staff.token()))
                .andExpect(status().isBadRequest());
        mvc.perform(get(PATH).param("sort", "UNSUPPORTED")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + staff.token()))
                .andExpect(status().isBadRequest());
        getAs(PATH + "/bad-id", staff).andExpect(status().isBadRequest());
    }

    private void account(UUID id, String name, int... roles) {
        jdbc.update("""
                INSERT INTO users (id, email, password_hash, full_name, created_at) VALUES (?, ?, '-', ?, ?)
                """, id, id + "@example.com", name, DATE);
        for (int role : roles) {
            jdbc.update("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", id, role);
        }
    }

    private void booking(UUID id, String code, String status, String payment, long amount, OffsetDateTime timestamp) {
        var bookingId = jdbc.queryForObject("""
                INSERT INTO bookings (code, kind, user_id, status, total_amount, contact_name,
                    contact_email, contact_phone, created_at)
                VALUES (?, 'TOUR', ?, ?, 1000, 'Khách', 'khach@example.com', '0900000000', ?) RETURNING id
                """, Long.class, code, id, status, timestamp);
        assertThat(bookingId).isNotNull();
        jdbc.update("""
                INSERT INTO payments (booking_id, method, amount, status, paid_at)
                VALUES (?, 'BANK_TRANSFER', ?, ?, ?)
                """, bookingId, amount, payment, payment.equals("PAID") ? timestamp : null);
    }
}
