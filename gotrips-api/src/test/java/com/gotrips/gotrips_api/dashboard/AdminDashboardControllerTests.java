package com.gotrips.gotrips_api.dashboard;

import static com.gotrips.gotrips_api.TestcontainersConfiguration.TODAY;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import com.gotrips.gotrips_api.support.BookingApiTest;

class AdminDashboardControllerTests extends BookingApiTest {

    private static final String DASHBOARD = "/admin/dashboard";
    private static final String RANGE = DASHBOARD + "?from=2026-11-22&to=2026-11-25";
    private static final String BEFORE_FIRST = "2026-11-21T16:59:59.999999Z";
    private static final String FIRST = "2026-11-21T17:00:00Z";
    private static final String BEFORE_END = "2026-11-25T16:59:59.999999Z";
    private static final String END = "2026-11-25T17:00:00Z";

    @Test
    void authorizationUsesAdminRoles() throws Exception {
        getAs(DASHBOARD, null).andExpect(status().isUnauthorized());
        var customer = client.customer();
        getAs(DASHBOARD, customer).andExpect(status().isForbidden());
        getAs(DASHBOARD, client.staff()).andExpect(status().isOk());

        jdbc.update("INSERT INTO user_roles (user_id, role_id) SELECT id, 3 FROM users WHERE email = ?", customer.email());
        jdbc.update("DELETE FROM user_roles WHERE role_id = 1 AND user_id = (SELECT id FROM users WHERE email = ?)",
                customer.email());
        newRequestBoundary();
        getAs(DASHBOARD, customer).andExpect(status().isOk());
    }

    @ParameterizedTest
    @CsvSource({
        "'', 2026-10-27, 2026-11-25, 30",
        "?to=2026-11-24, 2026-10-26, 2026-11-24, 30",
        "?from=2026-11-25, 2026-11-25, 2026-11-25, 1",
        "?from=2025-11-25&to=2026-11-25, 2025-11-25, 2026-11-25, 366" })
    void dateDefaultsAndEmptyDays(String params, String from, String to, int days) throws Exception {
        var staff = client.staff();
        jdbc.update("DELETE FROM user_roles WHERE role_id = 1 AND user_id = (SELECT id FROM users WHERE email = ?)",
                staff.email());
        jdbc.update("UPDATE users SET created_at = TIMESTAMPTZ '2000-01-01T00:00:00Z'");
        getAs(DASHBOARD + params, staff)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.from").value(from))
                .andExpect(jsonPath("$.to").value(to))
                .andExpect(jsonPath("$.revenueCollected").value(0))
                .andExpect(jsonPath("$.newBookings").value(0))
                .andExpect(jsonPath("$.newBookingsByKind.*", contains(0, 0, 0)))
                .andExpect(jsonPath("$.customers.newCustomers").value(0))
                .andExpect(jsonPath("$.refundPending.count").value(0))
                .andExpect(jsonPath("$.daily", hasSize(days)))
                .andExpect(jsonPath("$.daily[0].date").value(from))
                .andExpect(jsonPath("$.daily[" + (days - 1) + "].date").value(to))
                .andExpect(jsonPath("$.daily[?(@.newBookings != 0 || @.revenueCollected != 0)]").isEmpty())
                .andExpect(jsonPath("$.upcomingDepartures").isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = { "?from=2010-10-10", "?from=2026-11-26", "?to=ngay-sai", "?to=2026-02-29" })
    void invalidDatesReturnFieldErrors(String params) throws Exception {
        getAs(DASHBOARD + params, client.staff())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("to"));
    }

    @Test
    void includesTheFirstBoundaryAndExcludesTheLastForRevenueBookingsAndCustomers() throws Exception {
        var staff = client.staff();
        jdbc.update("DELETE FROM user_roles WHERE role_id = 1 AND user_id = (SELECT id FROM users WHERE email = ?)",
                staff.email());

        long existingCustomers = jdbc.queryForObject("SELECT count(*) FROM user_roles WHERE role_id = 1", Long.class);
        long existingNewCustomers = jdbc.queryForObject("""
                SELECT count(*) FROM users JOIN user_roles ON users.id = user_roles.user_id
                WHERE user_roles.role_id = 1 AND timezone('Asia/Ho_Chi_Minh', created_at)::date
                    BETWEEN DATE '2026-11-22' AND DATE '2026-11-25'
                """, Long.class);

        UUID customer = user(BEFORE_FIRST, 1);
        user(FIRST, 1, 2);
        user(BEFORE_END, 1);
        user(END, 1);
        user(FIRST, 2);
        user(FIRST, 3);

        booking(customer, "GT222222", "TOUR", "CONFIRMED", BEFORE_FIRST, "PAID", FIRST, 10);
        booking(customer, "GT222223", "TOUR", "CONFIRMED", FIRST, "PAID", BEFORE_FIRST, 20);
        booking(customer, "GT222224", "HOTEL", "PENDING", "2026-11-24T16:59:59.999999Z",
                "PAID", "2026-11-24T17:00:00Z", 30);
        booking(customer, "GT222225", "FLIGHT", "CANCELLED", BEFORE_END, "PAID", BEFORE_END, 40);
        booking(customer, "GT222226", "TOUR", "PENDING", END, "UNPAID", null, 50);
        booking(customer, "GT222227", "HOTEL", "CONFIRMED", BEFORE_FIRST, "PAID", END, 50);
        booking(customer, "GT222228", "FLIGHT", "CANCELLED", BEFORE_FIRST, "PAID", BEFORE_FIRST, 60);
        booking(customer, "GT222229", "TOUR", "CONFIRMED", BEFORE_FIRST, "PAID", BEFORE_END, 70);
        booking(customer, "GT22222A", "TOUR", "CANCELLED", BEFORE_FIRST, "CANCELLED", null, 80);
        newRequestBoundary();

        getAs(RANGE, staff).andExpect(status().isOk())
                .andExpect(jsonPath("$.revenueCollected").value(110))
                .andExpect(jsonPath("$.daily[*].revenueCollected", contains(10, 0, 0, 100)))
                .andExpect(jsonPath("$.newBookings").value(3))
                .andExpect(jsonPath("$.daily[*].newBookings", contains(1, 0, 1, 1)))
                .andExpect(jsonPath("$.daily[*].date", contains("2026-11-22", "2026-11-23", "2026-11-24", "2026-11-25")))
                .andExpect(jsonPath("$.newBookingsByKind.tour").value(1))
                .andExpect(jsonPath("$.newBookingsByKind.hotel").value(1))
                .andExpect(jsonPath("$.newBookingsByKind.flight").value(1))
                .andExpect(jsonPath("$.awaitingPayment").value(1))
                .andExpect(jsonPath("$.awaitingConfirmation").value(1))
                .andExpect(jsonPath("$.refundPending.count").value(2))
                .andExpect(jsonPath("$.refundPending.amount").value(100))
                .andExpect(jsonPath("$.customers.total").value(existingCustomers + 4))
                .andExpect(jsonPath("$.customers.newCustomers").value(existingNewCustomers + 2));
        getAs("/admin/bookings?status=PENDING&size=1", staff).andExpect(jsonPath("$.totalItems").value(2));
        getAs("/admin/bookings?status=PENDING&paymentStatus=PAID", staff).andExpect(jsonPath("$.totalItems").value(1));
        getAs("/admin/bookings?status=PENDING&paymentStatus=UNPAID", staff).andExpect(jsonPath("$.totalItems").value(1));
        getAs("/admin/bookings?status=CANCELLED&paymentStatus=PAID", staff).andExpect(jsonPath("$.totalItems").value(2));
    }

    @Test
    void departureWindowAndBookableToursUseSeparateRules() throws Exception {
        long place = data.destination("dashboard", "Điểm đến Tổng quan");
        long open = data.tour("dashboard-open", place, false, "ACTIVE");
        long soldOut = data.tour("dashboard-full", place, false, "ACTIVE");
        long closed = data.tour("dashboard-closed", place, false, "ACTIVE");
        long later = data.tour("dashboard-later", place, false, "ACTIVE");
        long hidden = data.tour("dashboard-hidden", place, false, "HIDDEN");
        long deleted = data.tour("dashboard-deleted", place, false, "DELETED");
        data.departure(later, TODAY.toString(), 100, null, 10, 0);
        data.departure(later, TODAY.plusDays(15).toString(), 100, null, 10, 0);
        data.departure(hidden, TODAY.plusDays(1).toString(), 100, null, 10, 0);
        data.departure(deleted, TODAY.plusDays(1).toString(), 100, null, 10, 0);
        long full = data.departure(soldOut, TODAY.plusDays(1).toString(), 100, null, 10, 10);
        long shut = data.departure(closed, TODAY.plusDays(1).toString(), 100, null, 10, 10);
        jdbc.update("UPDATE tour_departures SET sales_closed = true WHERE id = ?", shut);
        long next = data.departure(open, TODAY.plusDays(14).toString(), 100, null, 10, 3);
        var staff = client.staff();

        getAs(DASHBOARD, staff).andExpect(status().isOk())
                .andExpect(jsonPath("$.tours.active").value(4))
                .andExpect(jsonPath("$.tours.hidden").value(1))
                .andExpect(jsonPath("$.tours.bookable").value(2))
                .andExpect(jsonPath("$.upcomingDepartures[*].id", contains((int) full, (int) shut, (int) next)))
                .andExpect(jsonPath("$.upcomingDepartures[*].state", contains("SOLD_OUT", "CLOSED", "UPCOMING")))
                .andExpect(jsonPath("$.upcomingDepartures[2].bookedSeats").value(3))
                .andExpect(jsonPath("$.upcomingDepartures[2].totalSeats").value(10))
                .andExpect(jsonPath("$.upcomingDepartures[2].departureDate").value("2026-12-09"));

        for (int i = 2; i <= 12; i++) {
            data.departure(open, TODAY.plusDays(i).toString(), 100, null, 10, 3);
        }
        getAs(DASHBOARD, staff).andExpect(jsonPath("$.upcomingDepartures", hasSize(10)))
                .andExpect(jsonPath("$.upcomingDepartures[0].id").value((int) full))
                .andExpect(jsonPath("$.upcomingDepartures[9].departureDate").value(TODAY.plusDays(9).toString()));
    }

    @Test
    void openApiMatchesAdminOrvalContract() throws Exception {
        String operation = "$.paths['/admin/dashboard'].get";
        String schema = "$.components.schemas.AdminDashboardResponse";
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(operation + ".operationId").value("getAdminDashboard"))
                .andExpect(jsonPath(operation + ".tags", contains("Quản trị tổng quan")))
                .andExpect(jsonPath(operation + ".responses.keys()", contains("200")))
                .andExpect(jsonPath(operation + ".parameters[*].required", contains(false, false)))
                .andExpect(jsonPath(operation + ".parameters[*].schema.type", contains("string", "string")))
                .andExpect(jsonPath(operation + ".parameters[*].schema.format", contains("date", "date")))
                .andExpect(jsonPath(schema + ".required", containsInAnyOrder("from", "to", "revenueCollected",
                        "newBookings", "newBookingsByKind", "awaitingPayment", "awaitingConfirmation",
                        "refundPending", "customers", "tours", "daily", "upcomingDepartures")))
                .andExpect(jsonPath(schema + ".properties.revenueCollected.type").value("number"))
                .andExpect(jsonPath(schema + ".properties.*[?(@.nullable == true)]").isEmpty())
                .andExpect(jsonPath("$.components.schemas.DashboardDeparture.required",
                        containsInAnyOrder("id", "tourId", "tourTitle", "departureDate", "bookedSeats", "totalSeats", "state")));
    }

    private UUID user(String created, int... roles) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users (id, email, password_hash, full_name, created_at) VALUES (?, ?, '-', 'Khách', ?)",
                id, id + "@example.com", OffsetDateTime.parse(created));
        for (int role : roles) {
            jdbc.update("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", id, role);
        }
        return id;
    }

    private void booking(UUID userId, String code, String kind, String status, String created,
            String paymentStatus, String paid, int amount) {
        Long id = jdbc.queryForObject("""
                INSERT INTO bookings (code, kind, user_id, status, total_amount, contact_name, contact_email,
                    contact_phone, created_at) VALUES (?, ?, ?, ?, 9999, 'Tên', 'a@example.com', '0123', ?) RETURNING id
                """, Long.class, code, kind, userId, status, OffsetDateTime.parse(created));
        jdbc.update("""
                INSERT INTO payments (booking_id, method, amount, status, paid_at)
                VALUES (?, 'BANK_TRANSFER', ?, ?, ?)
                """, id, amount, paymentStatus, paid == null ? null : OffsetDateTime.parse(paid));
    }
}
