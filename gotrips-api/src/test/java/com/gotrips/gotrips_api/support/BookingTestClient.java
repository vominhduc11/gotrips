package com.gotrips.gotrips_api.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.jayway.jsonpath.JsonPath;

import lombok.RequiredArgsConstructor;

/**
 * Gọi API đặt chỗ trong test với tài khoản THẬT (đăng ký + đăng nhập qua API, token thật qua Spring Security thật), và
 * dựng body JSON. Không giữ trạng thái giữa các test.
 */
// Lombok xếp tham số constructor theo thứ tự khai báo các field final: đổi chỗ field là đổi chữ ký mà nơi gọi đang dùng.
@RequiredArgsConstructor
public class BookingTestClient {

    public static final String PASSWORD = "matkhau123";
    public static final String CONTACT = """
            {"fullName":"Nguyễn Minh Anh","email":"minhanh@example.com","phone":"0901 234 567"}""";

    private final MockMvc mvc;
    private final JdbcTemplate jdbc;
    /** Ranh giới request: test chạy chung một transaction thì phải quên entity đã nạp (xem {@code BookingApiTest}). */
    private final Runnable requestBoundary;

    /** Cho test không dùng transaction chung (mỗi request đã là một transaction thật). */
    public BookingTestClient(MockMvc mvc, JdbcTemplate jdbc) {
        this(mvc, jdbc, () -> {
        });
    }

    /** Một tài khoản vừa tạo: email và access token. */
    public record Account(String email, String token) {
    }

    public Account customer() throws Exception {
        String email = register();
        return new Account(email, login(email));
    }

    /** Tài khoản có thêm vai trò STAFF (gán trực tiếp trong DB như khi tạo nhân viên ở môi trường dev). */
    public Account staff() throws Exception {
        String email = register();
        // Nếu không, đăng nhập dùng lại User đã nạp lúc đăng ký (chưa có vai trò mới) và token thiếu quyền.
        requestBoundary.run();
        jdbc.update("INSERT INTO user_roles (user_id, role_id) SELECT id, 2 FROM users WHERE email = ?", email);
        return new Account(email, login(email));
    }

    private String register() throws Exception {
        String email = "khach-" + UUID.randomUUID() + "@example.com";
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                {"fullName":"Minh Anh","email":"%s","password":"%s"}""".formatted(email, PASSWORD)))
                .andExpect(status().isCreated());
        return email;
    }

    private String login(String email) throws Exception {
        ResultActions result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"%s","password":"%s"}""".formatted(email, PASSWORD))).andExpect(status().isOk());
        return JsonPath.read(body(result), "$.accessToken");
    }

    public ResultActions postJson(String path, String token, String json) throws Exception {
        var request = post(path).contentType(MediaType.APPLICATION_JSON).content(json);
        if (token != null) {
            request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        }
        return mvc.perform(request);
    }

    /** Gọi bất kỳ method nào bằng Bearer token; {@code json} null = không có body. */
    public ResultActions send(HttpMethod method, String path, String token, String json) throws Exception {
        var request = request(method, path);
        if (json != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(json);
        }
        if (token != null) {
            request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        }
        return mvc.perform(request);
    }

    public ResultActions getAs(String path, String token) throws Exception {
        var request = get(path);
        if (token != null) {
            request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        }
        return mvc.perform(request);
    }

    public static String body(ResultActions result) throws UnsupportedEncodingException {
        return result.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
    }

    public static String code(ResultActions result) throws UnsupportedEncodingException {
        return JsonPath.read(body(result), "$.code");
    }

    // ---- Body ----

    public static String tourBooking(long departureId, int guests) {
        StringBuilder travelers = new StringBuilder();
        for (int i = 0; i < guests; i++) {
            travelers.append(i > 0 ? "," : "").append("""
                    {"fullName":"Người đi %d","dateOfBirth":%s}""".formatted(i + 1, i == 0 ? "\"1995-04-12\"" : "null"));
        }
        return tourBooking(departureId, guests, "[" + travelers + "]", CONTACT);
    }

    public static String tourBooking(long departureId, int guests, String travelersJson, String contactJson) {
        return """
                {"departureId":%d,"guests":%d,"contact":%s,"travelers":%s,"note":"  Ăn chay  "}"""
                .formatted(departureId, guests, contactJson, travelersJson);
    }

    public static String hotelBooking(long roomTypeId, String checkIn, String checkOut, int guests, int rooms) {
        return """
                {"roomTypeId":%d,"checkIn":"%s","checkOut":"%s","guests":%d,"rooms":%d,"contact":%s,\
                "guestName":"Trần Văn Bình","note":null}"""
                .formatted(roomTypeId, checkIn, checkOut, guests, rooms, CONTACT);
    }

    /** {@code returnId}/{@code returnDate} null = một chiều. */
    public static String flightBooking(long outboundId, Long returnId, String from, String to, String departDate,
            String returnDate, String cabin, String passengersJson) {
        return """
                {"outboundScheduleId":%d,"returnScheduleId":%s,"from":"%s","to":"%s","departDate":"%s",\
                "returnDate":%s,"cabin":"%s","contact":%s,"passengers":%s,"note":""}"""
                .formatted(outboundId, returnId, from, to, departDate,
                        returnDate == null ? "null" : "\"" + returnDate + "\"", cabin, CONTACT, passengersJson);
    }

    public static String passenger(String type, String name, String dateOfBirth) {
        return """
                {"type":"%s","fullName":"%s","dateOfBirth":%s}"""
                .formatted(type, name, dateOfBirth == null ? "null" : "\"" + dateOfBirth + "\"");
    }

    public static String passengers(String... passengers) {
        return "[" + String.join(",", passengers) + "]";
    }

    public static String adults(int count) {
        String[] list = new String[count];
        for (int i = 0; i < count; i++) {
            list[i] = passenger("ADULT", "Người lớn " + (i + 1), null);
        }
        return passengers(list);
    }
}
