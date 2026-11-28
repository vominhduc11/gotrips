package com.gotrips.gotrips_api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.gotrips.gotrips_api.TestcontainersConfiguration;
import com.gotrips.gotrips_api.user.User;
import com.gotrips.gotrips_api.user.UserRepository;
import com.jayway.jsonpath.JsonPath;

import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.Jwts;

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
    @Autowired
    JdbcTemplate jdbc;
    /** Khoá ký thật của ứng dụng — dùng để dựng token hỏng đúng một chỗ (hết hạn, sai issuer...). */
    @Autowired
    SecretKey jwtSigningKey;

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

    private ResultActions updateProfile(String token, String fullName) throws Exception {
        return putProfile(token, """
                {"fullName":"%s"}""".formatted(fullName));
    }

    private ResultActions putProfile(String token, String body) throws Exception {
        return mvc.perform(put("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions changePassword(String token, String currentPassword, String newPassword) throws Exception {
        return mvc.perform(put("/auth/me/password").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"currentPassword":"%s","newPassword":"%s"}""".formatted(currentPassword, newPassword)));
    }

    @Test
    void updatesTheCurrentUsersNameAndPreservesEmailAndRoles() throws Exception {
        String email = uniqueEmail();
        register("Nguyễn Văn An", email, PASSWORD).andExpect(status().isCreated());
        String token = loginAndGetToken(email, PASSWORD);

        updateProfile(token, "  Nguyễn Văn Bình  ")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Nguyễn Văn Bình"))
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.roles[0]").value("CUSTOMER"));

        mvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Nguyễn Văn Bình"));
    }

    @ParameterizedTest
    @ValueSource(ints = { 0, 101 })
    void rejectsInvalidProfileNames(int length) throws Exception {
        String token = sign(validClaims(registeredUserId()));

        updateProfile(token, "  " + "a".repeat(length) + "  ")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("fullName"));
    }

    @Test
    void newAccountsHaveNullPhoneInLoginAndProfile() throws Exception {
        String email = uniqueEmail();
        register("Nguyễn Văn An", email, PASSWORD).andExpect(status().isCreated());
        String body = login(email, PASSWORD).andExpect(status().isOk())
                .andExpect(jsonPath("$.user.phone").value(nullValue()))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        String token = JsonPath.read(body, "$.accessToken");

        mvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.phone").value(nullValue()));
    }

    @Test
    void savesAndUpdatesPhoneAndReturnsItInProfileAndLogin() throws Exception {
        String email = uniqueEmail();
        register("Nguyễn Văn An", email, PASSWORD).andExpect(status().isCreated());
        String token = loginAndGetToken(email, PASSWORD);

        putProfile(token, """
                {"fullName":"Nguyễn Văn An","phone":"  0901 234 567  "}""")
                .andExpect(status().isOk()).andExpect(jsonPath("$.phone").value("0901 234 567"));
        putProfile(token, """
                {"fullName":"Nguyễn Văn An","phone":"+84 901 234 567"}""")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("phone"));
        putProfile(token, """
                {"fullName":"Nguyễn Văn An","phone":"+84901.234.567"}""")
                .andExpect(status().isOk()).andExpect(jsonPath("$.phone").value("+84901.234.567"));

        mvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.phone").value("+84901.234.567"));
        login(email, PASSWORD).andExpect(status().isOk()).andExpect(jsonPath("$.user.phone").value("+84901.234.567"));
    }

    @ParameterizedTest
    @ValueSource(strings = { "", ",\"phone\":null", ",\"phone\":\"\"", ",\"phone\":\"   \"" })
    void clearsSavedPhoneWhenOmittedNullOrBlank(String phoneProperty) throws Exception {
        String token = sign(validClaims(registeredUserId()));
        putProfile(token, """
                {"fullName":"Nguyễn Văn An","phone":"0901234567"}""")
                .andExpect(status().isOk()).andExpect(jsonPath("$.phone").value("0901234567"));

        putProfile(token, "{\"fullName\":\"Nguyễn Văn An\"" + phoneProperty + "}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.phone").value(nullValue()));
        mvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.phone").value(nullValue()));
    }

    @Test
    void rejectsEmptyPhoneAtDatabaseLevel() throws Exception {
        assertThatThrownBy(() -> jdbc.update("""
                insert into users (email, password_hash, full_name, phone) values (?, ?, ?, '')
                """, uniqueEmail(), "khong-dung-de-dang-nhap", "Nguyễn Văn An"))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("users_phone_not_blank");
    }

    @Test
    void accountWritesRejectTheTokenOfADeletedUser() throws Exception {
        UUID userId = registeredUserId();
        String token = sign(validClaims(userId));
        users.deleteById(userId);

        updateProfile(token, "Nguyễn Văn Bình").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Phiên đăng nhập không còn hợp lệ."));
        changePassword(token, PASSWORD, "matkhauMoi123").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Phiên đăng nhập không còn hợp lệ."));
    }

    @Test
    void changesPasswordAndKeepsPreviouslyIssuedTokenValid() throws Exception {
        String email = uniqueEmail();
        String newPassword = "matkhauMoi123";
        register("Nguyễn Văn An", email, PASSWORD).andExpect(status().isCreated());
        String token = loginAndGetToken(email, PASSWORD);

        changePassword(token, PASSWORD, newPassword).andExpect(status().isNoContent());

        login(email, PASSWORD).andExpect(status().isUnauthorized());
        login(email, newPassword).andExpect(status().isOk());
        mvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @CsvSource({ "matkhau-sai, matkhauMoi123, currentPassword", "matkhau123, yeu, newPassword" })
    void rejectsWrongCurrentPasswordOrWeakNewPassword(String current, String next, String field) throws Exception {
        String token = sign(validClaims(registeredUserId()));

        changePassword(token, current, next).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value(field));
    }

    @Test
    void rejectsANewPasswordOver72Utf8Bytes() throws Exception {
        String token = sign(validClaims(registeredUserId()));

        changePassword(token, PASSWORD, "ấ".repeat(24) + "1").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("newPassword"));
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

    /** Đối chứng cho các test từ chối bên dưới: token dựng đúng thì được nhận. */
    @Test
    void meAcceptsCorrectlySignedToken() throws Exception {
        String token = sign(validClaims(registeredUserId()));

        mvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void meRejectsTokenSignedWithAnotherKey() throws Exception {
        // Cùng nội dung, cùng issuer, nhưng ký bằng khoá khác (kẻ giả mạo token, kể cả đòi quyền ADMIN)
        SecretKey attackerKey = new SecretKeySpec(
                "khoa-cua-ke-gia-mao-token-khoa-cua-ke-gia-mao".getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        String forged = validClaims(registeredUserId()).claim("roles", List.of("ADMIN"))
                .signWith(attackerKey, Jwts.SIG.HS256).compact();

        assertRejectedAsInvalidToken(forged);
    }

    @Test
    void meRejectsExpiredToken() throws Exception {
        // Hết hạn từ 10 phút trước (vượt xa độ lệch đồng hồ cho phép 60 giây)
        String expired = sign(validClaims(registeredUserId())
                .expiration(Date.from(Instant.now().minusSeconds(600))));

        assertRejectedAsInvalidToken(expired);
    }

    @Test
    void meRejectsTokenWithoutExpiry() throws Exception {
        String endless = sign(validClaims(registeredUserId()).expiration(null));

        assertRejectedAsInvalidToken(endless);
    }

    @Test
    void meRejectsTokenOfAnotherIssuer() throws Exception {
        String foreign = sign(validClaims(registeredUserId()).issuer("he-thong-khac"));

        assertRejectedAsInvalidToken(foreign);
    }

    @Test
    void meRejectsTokenUsingAnotherHmacAlgorithm() throws Exception {
        // Đúng khoá của ứng dụng nhưng HS384: API chỉ nhận HS256
        String hs384 = validClaims(registeredUserId())
                .signWith(new SecretKeySpec(jwtSigningKey.getEncoded(), "HmacSHA384"), Jwts.SIG.HS384)
                .compact();

        assertRejectedAsInvalidToken(hs384);
    }

    @Test
    void meRejectsUnsignedToken() throws Exception {
        String unsigned = validClaims(registeredUserId()).compact();

        assertRejectedAsInvalidToken(unsigned);
    }

    @Test
    void meRejectsValidTokenOfDeletedAccount() throws Exception {
        // Token hợp lệ về chữ ký/hạn nhưng tài khoản không còn → 401 (không phải 500)
        String token = sign(validClaims(UUID.randomUUID()));

        mvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Phiên đăng nhập không còn hợp lệ."));
    }

    @Test
    void healthEndpointStaysPublic() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    private UUID registeredUserId() throws Exception {
        String email = uniqueEmail();
        register("Nguyễn Văn An", email, PASSWORD).andExpect(status().isCreated());
        return users.findByEmail(email).orElseThrow().getId();
    }

    private JwtBuilder validClaims(UUID userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer("gotrips-api")
                .subject(userId.toString())
                .issuedAt(Date.from(now.minusSeconds(3600)))
                .expiration(Date.from(now.plusSeconds(600)))
                .claim("roles", List.of("CUSTOMER"));
    }

    private String sign(JwtBuilder claims) {
        return claims.signWith(jwtSigningKey, Jwts.SIG.HS256).compact();
    }

    /** 401 do chính bước kiểm token (header có {@code error="invalid_token"}), không phải do tầng nghiệp vụ. */
    private void assertRejectedAsInvalidToken(String token) throws Exception {
        mvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string(HttpHeaders.WWW_AUTHENTICATE,
                        startsWith("Bearer error=\"invalid_token\"")));
    }
}
