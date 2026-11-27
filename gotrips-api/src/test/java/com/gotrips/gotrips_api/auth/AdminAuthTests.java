package com.gotrips.gotrips_api.auth;

import static com.gotrips.gotrips_api.support.BookingTestClient.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.ResultActions;

import com.gotrips.gotrips_api.config.AdminSecurityConfig;
import com.gotrips.gotrips_api.support.BookingApiTest;
import com.jayway.jsonpath.JsonPath;

import jakarta.servlet.http.Cookie;

class AdminAuthTests extends BookingApiTest {

    private static final String AUTH = "/admin/auth";
    private static final String XSRF_COOKIE = "XSRF-TOKEN";
    private static final String XSRF_HEADER = "X-XSRF-TOKEN";
    private static final String SESSION = AdminSecurityConfig.SESSION_COOKIE;
    private static final String MARK_PAID = "/admin/bookings/GT222222/mark-paid";

    @Autowired
    private JwtDecoder decoder;

    @Test
    void staffGetsTheAdminCookieAndMeUsesItWithoutABearerHeader() throws Exception {
        var account = client.staff();
        Cookie csrf = bootstrap();
        var response = login(account.email(), PASSWORD, csrf)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.email").value(account.email()))
                .andExpect(jsonPath("$.roles", hasItem("STAFF")))
                .andReturn().getResponse();

        Cookie session = response.getCookie(SESSION);
        assertThat(session).isNotNull();
        assertThat(session.isHttpOnly()).isTrue();
        assertThat(session.getSecure()).isTrue();
        assertThat(session.getPath()).isEqualTo("/");
        assertThat(session.getAttribute("SameSite")).isEqualTo("Strict");
        assertThat(session.getMaxAge()).isEqualTo(8 * 60 * 60);
        var jwt = decoder.decode(session.getValue());
        assertThat(Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt())).isEqualTo(Duration.ofHours(8));

        Cookie rotatedCsrf = response.getCookie(XSRF_COOKIE);
        assertThat(rotatedCsrf.getValue()).isNotEqualTo(csrf.getValue());
        assertThat(rotatedCsrf.isHttpOnly()).isFalse();

        mvc.perform(get(AUTH + "/me").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles", hasItem("STAFF")));
        mvc.perform(get("/auth/me").cookie(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void wrongCredentialsReturnTheSameMessageAsPublicLogin() throws Exception {
        login("missing@gotrips.test", PASSWORD, bootstrap())
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value(AuthService.INVALID_CREDENTIALS));
        login(client.staff().email(), "wrong-password", bootstrap())
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value(AuthService.INVALID_CREDENTIALS));
    }

    @Test
    void customerWithCorrectPasswordIsDenied() throws Exception {
        var response = login(client.customer().email(), PASSWORD, bootstrap())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("Tài khoản không có quyền truy cập trang quản trị"))
                .andReturn().getResponse();
        assertThat(response.getCookie(SESSION)).isNull();
    }

    @Test
    void missingOrDamagedSessionIsUnauthorized() throws Exception {
        bootstrap();
        mvc.perform(get(AUTH + "/me").cookie(new Cookie(SESSION, "bad-jwt"))).andExpect(status().isUnauthorized());
    }

    @Test
    void cookieWritesRequireCsrfAndBearerWritesReachTheController() throws Exception {
        var account = client.staff();
        var response = login(account.email(), PASSWORD, bootstrap()).andExpect(status().isOk()).andReturn().getResponse();
        Cookie session = response.getCookie(SESSION);
        Cookie csrf = response.getCookie(XSRF_COOKIE);

        var denied = mvc.perform(post(MARK_PAID).cookie(session, csrf)).andExpect(status().isForbidden())
                .andReturn().getResponse();
        // Đặt status trực tiếp để Tomcat không chuyển lượt gọi sang chain khác ở /error.
        assertThat(denied.getErrorMessage()).isNull();
        mvc.perform(post(MARK_PAID).cookie(session, csrf).header(XSRF_HEADER, csrf.getValue()))
                .andExpect(status().isNotFound());
        mvc.perform(post(MARK_PAID).cookie(new Cookie(SESSION, "bad-jwt"))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + account.token()))
                .andExpect(status().isNotFound());
        mvc.perform(post(MARK_PAID)).andExpect(status().isUnauthorized());
    }

    @Test
    void loginAndLogoutRequireCsrfAndLogoutWorksWithAnInvalidSession() throws Exception {
        mvc.perform(post(AUTH + "/login").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        Cookie csrf = bootstrap();
        Cookie expired = new Cookie(SESSION, "expired-jwt");
        mvc.perform(post(AUTH + "/logout").cookie(expired, csrf)).andExpect(status().isForbidden());
        var response = mvc.perform(post(AUTH + "/logout").cookie(expired, csrf).header(XSRF_HEADER, csrf.getValue()))
                .andExpect(status().isNoContent()).andReturn().getResponse();

        Cookie removed = response.getCookie(SESSION);
        assertThat(removed.getMaxAge()).isZero();
        assertThat(removed.getPath()).isEqualTo("/");
        assertThat(removed.isHttpOnly()).isTrue();
        assertThat(response.getCookie(XSRF_COOKIE).getMaxAge()).isZero();
    }

    @Test
    void revokedRoleAndDeletedAccountAreSeenOnTheNextRequest() throws Exception {
        var account = client.staff();
        var response = login(account.email(), PASSWORD, bootstrap()).andExpect(status().isOk()).andReturn().getResponse();
        Cookie session = response.getCookie(SESSION);
        newRequestBoundary();
        jdbc.update("DELETE FROM user_roles WHERE role_id = 2 AND user_id = (SELECT id FROM users WHERE email = ?)",
                account.email());

        mvc.perform(get(AUTH + "/me").cookie(session)).andExpect(status().isForbidden());
        getAs(AUTH + "/me", account).andExpect(status().isForbidden());
        jdbc.update("DELETE FROM users WHERE email = ?", account.email());
        newRequestBoundary();
        mvc.perform(get(AUTH + "/me").cookie(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void changesPasswordWithCookieAndCsrfAndKeepsExistingJwtUntilExpiry() throws Exception {
        var account = client.staff();
        var response = login(account.email(), PASSWORD, bootstrap()).andExpect(status().isOk()).andReturn().getResponse();
        Cookie session = response.getCookie(SESSION);
        Cookie csrf = response.getCookie(XSRF_COOKIE);
        String newPassword = "ắ".repeat(23) + "a12";
        String validBody = passwordBody(PASSWORD, newPassword);
        String path = AUTH + "/password";

        mvc.perform(put(path).cookie(session, csrf).contentType(MediaType.APPLICATION_JSON).content(validBody))
                .andExpect(status().isForbidden());
        mvc.perform(put(path).contentType(MediaType.APPLICATION_JSON).content(validBody))
                .andExpect(status().isUnauthorized());
        var customer = client.customer();
        client.send(HttpMethod.PUT, path, customer.token(), validBody).andExpect(status().isForbidden());

        client.send(HttpMethod.PUT, path, account.token(), passwordBody("matkhau-sai", newPassword))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("currentPassword"));
        client.send(HttpMethod.PUT, path, account.token(), passwordBody(PASSWORD, newPassword + "3"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("newPassword"));
        mvc.perform(put(path).cookie(session, csrf).header(XSRF_HEADER, csrf.getValue())
                    .contentType(MediaType.APPLICATION_JSON).content(validBody))
                .andExpect(status().isNoContent());
        newRequestBoundary();

        mvc.perform(get(AUTH + "/me").cookie(session)).andExpect(status().isOk());
        login(account.email(), PASSWORD, bootstrap()).andExpect(status().isUnauthorized());
        login(account.email(), newPassword, bootstrap()).andExpect(status().isOk());
    }

    @Test
    void adminCanChangeOwnPasswordWithBearer() throws Exception {
        var account = client.customer();
        newRequestBoundary();
        jdbc.update("INSERT INTO user_roles (user_id, role_id) SELECT id, 3 FROM users WHERE email = ?",
                account.email());
        client.send(HttpMethod.PUT, AUTH + "/password", account.token(), passwordBody(PASSWORD, "matkhauMoi72"))
                .andExpect(status().isNoContent());
        newRequestBoundary();
        login(account.email(), "matkhauMoi72", bootstrap()).andExpect(status().isOk());
    }

    private static String passwordBody(String current, String next) {
        return """
                {"currentPassword":"%s","newPassword":"%s"}
                """.formatted(current, next);
    }

    @Test
    void openApiIdsAndAdminTagsMatchTheClients() throws Exception {
        var response = mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/admin/auth/login'].post.operationId").value("adminLogin"))
                .andExpect(jsonPath("$.paths['/admin/auth/logout'].post.operationId").value("adminLogout"))
                .andExpect(jsonPath("$.paths['/admin/auth/me'].get.operationId").value("getAdminMe"))
                .andExpect(jsonPath("$.paths['/admin/auth/logout'].post.responses['204']").exists())
                .andExpect(jsonPath("$.paths['/admin/auth/me'].get.security[*].adminCookieAuth").exists())
                .andExpect(jsonPath("$.components.securitySchemes.adminCookieAuth.in").value("cookie"))
                .andExpect(jsonPath("$.components.securitySchemes.adminCookieAuth.name").value(SESSION))
                .andReturn().getResponse();
        Map<String, Map<String, Map<String, Object>>> paths =
                JsonPath.read(response.getContentAsString(StandardCharsets.UTF_8), "$.paths");
        paths.forEach((path, operations) -> operations.values().forEach(operation -> {
            boolean adminTag = ((List<?>) operation.getOrDefault("tags", List.of())).stream()
                    .anyMatch(tag -> tag.toString().startsWith("Quản trị "));
            assertThat(adminTag).as(path).isEqualTo(path.startsWith("/admin/"));
        }));
    }

    private Cookie bootstrap() throws Exception {
        return mvc.perform(get(AUTH + "/me")).andExpect(status().isUnauthorized())
                .andReturn().getResponse().getCookie(XSRF_COOKIE);
    }

    private ResultActions login(String email, String password, Cookie csrf) throws Exception {
        return mvc.perform(post(AUTH + "/login").cookie(csrf).header(XSRF_HEADER, csrf.getValue())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s","password":"%s"}""".formatted(email, password)));
    }
}
