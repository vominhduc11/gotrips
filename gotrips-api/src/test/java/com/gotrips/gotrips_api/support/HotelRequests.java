package com.gotrips.gotrips_api.support;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.test.web.servlet.ResultActions;

import com.jayway.jsonpath.JsonPath;

import tools.jackson.databind.json.JsonMapper;

/** Body hợp lệ cho API quản trị khách sạn và loại phòng; test sửa đúng trường nó muốn kiểm. */
public final class HotelRequests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private HotelRequests() {
    }

    /** URL ảnh nằm trong danh sách cho phép mặc định. */
    public static String photo(String name) {
        return "https://images.unsplash.com/photo-" + name;
    }

    /** Ảnh gửi lên: URL {@code photo(name)}, mô tả "Ảnh &lt;name&gt;". */
    public static Map<String, String> image(String name) {
        return Map.of("url", photo(name), "alt", "Ảnh " + name);
    }

    public static Map<String, Object> hotel(String slug, long destinationId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("slug", slug);
        body.put("name", "Khách sạn Đồi Thông");
        body.put("destinationId", destinationId);
        body.put("starRating", 4);
        body.put("area", "Phường 3, Đà Lạt");
        body.put("imageUrl", photo("dai-dien"));
        body.put("imageAlt", "Mặt tiền khách sạn");
        body.put("description", "Khách sạn trên đồi thông.");
        body.put("amenityCodes", List.of());
        body.put("images", List.of());
        body.put("checkInTime", "14:00");
        body.put("checkOutTime", "11:30");
        return body;
    }

    public static Map<String, Object> room(String name, int totalRooms) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", name);
        body.put("pricePerNight", 900_000);
        body.put("maxGuests", 2);
        body.put("bedType", "1 giường đôi");
        body.put("areaM2", 24);
        body.put("totalRooms", totalRooms);
        body.put("amenityCodes", List.of());
        body.put("images", List.of());
        return body;
    }

    /** Bản sao của {@code body} với một trường thay bằng {@code value} (kể cả {@code null}). */
    public static Map<String, Object> with(Map<String, Object> body, String field, Object value) {
        Map<String, Object> copy = new LinkedHashMap<>(body);
        copy.put(field, value);
        return copy;
    }

    public static String json(Map<String, Object> body) {
        return JSON.writeValueAsString(body);
    }

    public static long id(ResultActions result) throws Exception {
        return ((Number) JsonPath.read(BookingTestClient.body(result), "$.id")).longValue();
    }
}
