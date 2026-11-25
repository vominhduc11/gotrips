package com.gotrips.gotrips_api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.gotrips.gotrips_api.TestcontainersConfiguration;
import com.gotrips.gotrips_api.user.User;
import com.gotrips.gotrips_api.user.UserRepository;
import com.jayway.jsonpath.JsonPath;
import com.nimbusds.jose.jwk.source.ImmutableSecret;

/** Luồng đăng ký → đăng nhập → /auth/me với PostgreSQL thật (Testcontainers) và Spring Security thật. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AuthControllerTests {

    private static final String PASSWORD = "matkhau123";

    @Autowired
    MockMvc mvc;
    @Autowired
    UserRepository users;
    /** Encoder thật của ứng dụng (cùng khoá với decoder) — dùng để dựng token hết hạn. */
    @Autowired
    JwtEncoder jwtEncoder;

    private static String uniqueEmail() {
        return "user-" + UUID.randomUUID() + "@example.com";
    }

    private static String registerJson(String fullName, String email, String password) {
        return """
                {"fullName":"%s","email":"%s","password":"%s"}""".formatted(fullName, email, password);
    }

    private static String loginJson(String email, String password) {
        return """
                {"email":"%s","password":"%s"}""".formatted(email, password);
    }

    private ResultActions register(String fullName, String email, String password) throws Exception {
        return mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(registerJson(fullName, email, password)));
    }

    private ResultActions login(String email, String password) throws Exception {
        return mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(loginJson(email, password)));
    }

    private String loginAndGetToken(String email, String password) throws Exception {
        String body = login(email, password).andExpect(status().isOk()).andReturn().getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        return JsonPath.read(body, "$.accessToken");
    }

    // ---------- đăng ký ----------

    @Test
    void registerCreatesCustomerAndNeverExposesPassword() throws Exception {
        String email = uniqueEmail();

        register("  Nguyễn Văn An  ", email.toUpperCase(), PASSWORD)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                // Email lưu chữ thường, tên bỏ khoảng trắng thừa
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.fullName").value("Nguyễn Văn An"))
                .andExpect(jsonPath("$.roles[0]").value("CUSTOMER"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        User saved = users.findByEmail(email).orElseThrow();
        assertThat(saved.getPasswordHash()).startsWith("{bcrypt}").doesNotContain(PASSWORD);
    }

    @Test
    void registerRejectsDuplicateEmailIgnoringCase() throws Exception {
        String email = uniqueEmail();
        register("Người Thứ Nhất", email, PASSWORD).andExpect(status().isCreated());

        register("Người Thứ Hai", email.toUpperCase(), PASSWORD)
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors[0].field").value("email"))
                .andExpect(jsonPath("$.errors[0].message").isNotEmpty());
    }

    @Test
    void registerReportsEveryInvalidField() throws Exception {
        register("A", "khong-phai-email", "abc")
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors[?(@.field=='fullName')]").exists())
                .andExpect(jsonPath("$.errors[?(@.field=='email')]").exists())
                .andExpect(jsonPath("$.errors[?(@.field=='password')]").exists());
    }

    @Test
    void registerRejectsPasswordWithoutLetterOrDigit() throws Exception {
        register("Nguyễn Văn An", uniqueEmail(), "12345678")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field=='password')]").exists());
        register("Nguyễn Văn An", uniqueEmail(), "chicochucai")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field=='password')]").exists());
    }

    @Test
    void registerRejectsPasswordOver72BytesEvenWhenUnder72Characters() throws Exception {
        // 30 ký tự nhưng mỗi "ế" là 3 byte UTF-8 → 90 byte: BCrypt sẽ cắt/ném lỗi nếu không chặn ở validate
        String password = "ế".repeat(29) + "1";
        assertThat(password.length()).isLessThanOrEqualTo(72);

        register("Nguyễn Văn An", uniqueEmail(), password)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field=='password')]").exists());
    }

    @Test
    void registerIgnoresAnyRoleSentByClient() throws Exception {
        String email = uniqueEmail();
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"fullName":"Kẻ Tấn Công","email":"%s","password":"%s","roles":["ADMIN"]}"""
                        .formatted(email, PASSWORD)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.roles.length()").value(1))
                .andExpect(jsonPath("$.roles[0]").value("CUSTOMER"));
    }

    // ---------- đăng nhập ----------

    @Test
    void loginReturnsBearerTokenAndUser() throws Exception {
        String email = uniqueEmail();
        register("Nguyễn Văn An", email, PASSWORD).andExpect(status().isCreated());

        // Email gõ hoa/thừa khoảng trắng vẫn đăng nhập được
        login("  " + email.toUpperCase() + " ", PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(7 * 24 * 3600))
                .andExpect(jsonPath("$.user.email").value(email))
                .andExpect(jsonPath("$.user.fullName").value("Nguyễn Văn An"))
                .andExpect(jsonPath("$.user.roles[0]").value("CUSTOMER"));
    }

    @Test
    void loginGivesSameErrorForWrongPasswordAndUnknownEmail() throws Exception {
        String email = uniqueEmail();
        register("Nguyễn Văn An", email, PASSWORD).andExpect(status().isCreated());

        String wrongPassword = login(email, "sai-mat-khau-1").andExpect(status().isUnauthorized())
                .andExpect(header().string(HttpHeaders.WWW_AUTHENTICATE, "Bearer"))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        String unknownEmail = login(uniqueEmail(), "sai-mat-khau-1").andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        // Không phân biệt được "email chưa đăng ký" với "sai mật khẩu"
        assertThat((String) JsonPath.read(wrongPassword, "$.detail"))
                .isEqualTo(JsonPath.read(unknownEmail, "$.detail"))
                .isEqualTo("Email hoặc mật khẩu không đúng.");
    }

    @Test
    void loginValidatesBody() throws Exception {
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field=='email')]").exists())
                .andExpect(jsonPath("$.errors[?(@.field=='password')]").exists());
    }

    // ---------- /auth/me ----------

    @Test
    void meReturnsCurrentUserForValidToken() throws Exception {
        String email = uniqueEmail();
        register("Nguyễn Văn An", email, PASSWORD).andExpect(status().isCreated());
        String token = loginAndGetToken(email, PASSWORD);

        mvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.fullName").value("Nguyễn Văn An"))
                .andExpect(jsonPath("$.roles[0]").value("CUSTOMER"));
    }

    @Test
    void meRequiresToken() throws Exception {
        mvc.perform(get("/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer khong.phai.token"))
                .andExpect(status().isUnauthorized());
        // Thuật toán/định dạng khác Bearer cũng không được chấp nhận
        mvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Basic dGVzdDp0ZXN0"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void meRejectsTokenSignedWithAnotherKey() throws Exception {
        String email = uniqueEmail();
        register("Nguyễn Văn An", email, PASSWORD).andExpect(status().isCreated());
        UUID userId = users.findByEmail(email).orElseThrow().getId();

        // Cùng nội dung, cùng issuer, nhưng ký bằng khoá khác (kẻ giả mạo token, kể cả đòi quyền ADMIN)
        JwtEncoder attacker = new NimbusJwtEncoder(new ImmutableSecret<>(new SecretKeySpec(
                "khoa-cua-ke-gia-mao-token-khoa-cua-ke-gia-mao".getBytes(StandardCharsets.UTF_8), "HmacSHA256")));
        String forged = encode(attacker, userId, Instant.now().plusSeconds(600), List.of("ADMIN"));

        mvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + forged))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void meRejectsExpiredToken() throws Exception {
        String email = uniqueEmail();
        register("Nguyễn Văn An", email, PASSWORD).andExpect(status().isCreated());
        UUID userId = users.findByEmail(email).orElseThrow().getId();

        // Hết hạn từ 10 phút trước (vượt xa độ lệch đồng hồ cho phép 60 giây)
        String expired = encode(jwtEncoder, userId, Instant.now().minusSeconds(600), List.of("CUSTOMER"));

        mvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void meRejectsValidTokenOfDeletedAccount() throws Exception {
        // Token hợp lệ về chữ ký/hạn nhưng tài khoản không còn → 401 (không phải 500)
        String token = encode(jwtEncoder, UUID.randomUUID(), Instant.now().plusSeconds(600), List.of("CUSTOMER"));

        mvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Phiên đăng nhập không còn hợp lệ."));
    }

    @Test
    void healthEndpointStaysPublic() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    private String encode(JwtEncoder encoder, UUID userId, Instant expiresAt, List<String> roles) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("gotrips-api")
                .issuedAt(expiresAt.minusSeconds(3600))
                .expiresAt(expiresAt)
                .subject(userId.toString())
                .claim("roles", roles)
                .build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
    }
}
