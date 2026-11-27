package com.gotrips.gotrips_api.user;

import static com.gotrips.gotrips_api.support.BookingTestClient.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItems;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import com.gotrips.gotrips_api.config.AdminSecurityConfig;
import com.gotrips.gotrips_api.support.BookingApiTest;
import com.gotrips.gotrips_api.support.BookingTestClient;
import com.gotrips.gotrips_api.support.BookingTestClient.Account;
import com.jayway.jsonpath.JsonPath;

class AdminStaffTests extends BookingApiTest {

    private static final String STAFF = "/admin/staff";
    private static final String ADMIN_ME = "/admin/auth/me";
    private static final String ROLE = "{\"role\":\"STAFF\"}";

    @Test
    void staffCreationNormalizesFieldsAndAssignsOnlyTheChosenRole() throws Exception {
        var admin = admin();
        String email = "g5-" + UUID.randomUUID() + "@example.com";
        var created = send(HttpMethod.POST, STAFF, admin, staffBody("  Nhân viên mới  ",
                " " + email.toUpperCase(java.util.Locale.ROOT) + " ", PASSWORD, "STAFF"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fullName").value("Nhân viên mới"))
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value("STAFF"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
        var id = UUID.fromString(JsonPath.read(BookingTestClient.body(created), "$.id"));
        assertThat(roleNames(id)).containsExactly("STAFF");
        getAs(STAFF, admin).andExpect(status().isOk())
                .andExpect(jsonPath("$[*].role").value(hasItems("STAFF", "ADMIN")));

        send(HttpMethod.POST, STAFF, admin, staffBody("Trùng email", email, PASSWORD, "ADMIN"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.errors[0].field").value("email"));
        send(HttpMethod.POST, STAFF, admin, staffBody("Nhân viên khác", "new@example.com", "ắ".repeat(24) + "7", "STAFF"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("password"));
        send(HttpMethod.POST, STAFF, admin, staffBody("Nhân viên khác", "new@example.com", PASSWORD, "CUSTOMER"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void onlyAdminCanAccessEveryStaffOperation() throws Exception {
        var staff = client.staff();
        var target = STAFF + "/" + UUID.randomUUID() + "/role";
        for (var caller : new Account[] { null, staff, client.customer() }) {
            int expected = caller == null ? 401 : 403;
            send(HttpMethod.GET, STAFF, caller, null).andExpect(status().is(expected));
            send(HttpMethod.POST, STAFF, caller, staffBody("Nhân viên", "new@example.com", PASSWORD, "STAFF"))
                    .andExpect(status().is(expected));
            send(HttpMethod.PUT, target, caller, ROLE).andExpect(status().is(expected));
            send(HttpMethod.DELETE, target, caller, null).andExpect(status().is(expected));
        }
    }

    @Test
    void changesThenRevokesRolesWithoutDeletingCustomerOrOrdersAndRejectsAnOpenSession() throws Exception {
        var admin = admin();
        var staff = client.staff();
        var id = userId(staff);
        var path = STAFF + "/" + id + "/role";
        // Đơn đã có tiếp tục trỏ đến tài khoản sau khi đổi quyền và thu hồi.
        jdbc.update("""
                INSERT INTO bookings (code, kind, user_id, status, total_amount, contact_name, contact_email, contact_phone, created_at)
                VALUES ('GT666666', 'TOUR', ?, 'PENDING', 100, 'Khách', 'khach@example.com', '0900000000', now())
                """, id);
        var csrf = mvc.perform(get(ADMIN_ME)).andExpect(status().isUnauthorized())
                .andReturn().getResponse().getCookie("XSRF-TOKEN");
        var session = mvc.perform(post("/admin/auth/login").cookie(csrf).header("X-XSRF-TOKEN", csrf.getValue())
                    .contentType(MediaType.APPLICATION_JSON).content("""
                            {"email":"%s","password":"%s"}""".formatted(staff.email(), PASSWORD)))
                .andExpect(status().isOk()).andReturn().getResponse().getCookie(AdminSecurityConfig.SESSION_COOKIE);

        send(HttpMethod.PUT, path, admin, "{\"role\":\"ADMIN\"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));
        assertThat(roleNames(id)).containsExactly("ADMIN", "CUSTOMER");
        send(HttpMethod.PUT, path, admin, ROLE).andExpect(status().isOk());
        getAs(ADMIN_ME, staff).andExpect(jsonPath("$.roles").value(hasItems("STAFF", "CUSTOMER")));
        send(HttpMethod.DELETE, path, admin, null).andExpect(status().isNoContent());
        assertThat(roleNames(id)).containsExactly("CUSTOMER");
        assertThat(count("SELECT count(*) FROM bookings WHERE user_id = ?", id)).isEqualTo(1);
        mvc.perform(get("/admin/customers").cookie(session)).andExpect(status().isForbidden());
        mvc.perform(get(ADMIN_ME).cookie(session)).andExpect(status().isForbidden());
        getAs("/auth/me", staff).andExpect(status().isOk());
        send(HttpMethod.DELETE, path, admin, null).andExpect(status().isNotFound());
    }

    @Test
    void cannotChangeOrRevokeOwnRoleAndDoesNotPromoteACustomerThroughUpdate() throws Exception {
        var admin = admin();
        var ownPath = STAFF + "/" + userId(admin) + "/role";
        send(HttpMethod.PUT, ownPath, admin, ROLE).andExpect(status().isConflict());
        send(HttpMethod.DELETE, ownPath, admin, null).andExpect(status().isConflict());
        assertThat(roleNames(userId(admin))).contains("ADMIN");
        var customerPath = STAFF + "/" + userId(client.customer()) + "/role";
        send(HttpMethod.PUT, customerPath, admin, ROLE).andExpect(status().isNotFound());
    }

    @Test
    void bookingDetailReportsWhetherTheOwnerHasACustomerProfile() throws Exception {
        var admin = admin();
        var owner = client.staff();
        var id = userId(owner);
        var destination = data.destination("ho-so-don", "Hồ sơ đơn");
        long tour = data.tour("tour-ho-so", destination, false, "ACTIVE");
        long departure = data.departure(tour, com.gotrips.gotrips_api.TestcontainersConfiguration.TODAY.plusDays(4).toString(), 1000, null, 10, 0);
        var code = BookingTestClient.code(postAs("/bookings/tours", owner, BookingTestClient.tourBooking(departure, 1))
                .andExpect(status().isCreated()));
        getAs("/admin/bookings/" + code, admin).andExpect(jsonPath("$.customer.hasCustomerProfile").value(true));

        jdbc.update("DELETE FROM user_roles WHERE user_id = ? AND role_id = 1", id);
        getAs("/admin/bookings/" + code, admin)
                .andExpect(jsonPath("$.customer.hasCustomerProfile").value(false));
        getAs("/admin/customers/" + id, admin).andExpect(status().isNotFound());
    }

    private Account admin() throws Exception {
        Account account = client.customer();
        newRequestBoundary();
        jdbc.update("INSERT INTO user_roles (user_id, role_id) VALUES (?, 3)", userId(account));
        return account;
    }

    private UUID userId(Account account) {
        return jdbc.queryForObject("SELECT id FROM users WHERE email = ?", UUID.class, account.email());
    }

    private List<String> roleNames(UUID id) {
        return jdbc.queryForList("""
                SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = ? ORDER BY r.name
                """, String.class, id);
    }

    private ResultActions send(HttpMethod method, String path, Account account, String body) throws Exception {
        var result = client.send(method, path, account == null ? null : account.token(), body);
        newRequestBoundary();
        return result;
    }

    private static String staffBody(String name, String email, String password, String role) {
        return """
                {"fullName":"%s","email":"%s","password":"%s","role":"%s"}
                """.formatted(name, email, password, role);
    }
}
