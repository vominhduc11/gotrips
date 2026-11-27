package com.gotrips.gotrips_api.tour;

import static com.gotrips.gotrips_api.support.BookingTestClient.body;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.http.HttpMethod;

import com.gotrips.gotrips_api.support.AdminCatalogApiTest;
import com.jayway.jsonpath.JsonPath;

class AdminTourControllerTests extends AdminCatalogApiTest {

    private static final String PATH = "/admin/tours";

    private long daLat;

    @BeforeEach
    void createDestination() {
        daLat = data.destination("da-lat", "Đà Lạt");
    }

    /** Request hợp lệ; {@code changes} ghi đè từng trường bằng giá trị JSON thô. */
    private String request(Map<String, String> changes) {
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("slug", "\"da-lat-moi\"");
        fields.put("title", "\"Đà Lạt mới\"");
        fields.put("destinationId", String.valueOf(daLat));
        fields.put("durationDays", "3");
        fields.put("durationNights", "2");
        fields.put("departureCity", "\"TP. Hồ Chí Minh\"");
        fields.put("shortDescription", "\"Giới thiệu\"");
        fields.put("coverImageUrl", "\"" + IMAGE + "\"");
        fields.put("coverImageAlt", "\"Rừng thông\"");
        fields.put("featured", "true");
        fields.putAll(changes);
        return fields.entrySet().stream().map(e -> "\"" + e.getKey() + "\":" + e.getValue())
                .collect(Collectors.joining(",", "{", "}"));
    }

    private String request() {
        return request(Map.of());
    }

    private static int id(String json) {
        return JsonPath.read(json, "$.id");
    }

    @Test
    void createdTourIsActiveByDefaultAndImmediatelyPublic() throws Exception {
        adminPost(PATH, request(Map.of("title", "\"  Đà Lạt mới  \"")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Đà Lạt mới"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.destinationName").value("Đà Lạt"))
                .andExpect(jsonPath("$.rating").value(0.0))
                .andExpect(jsonPath("$.reviewCount").value(0))
                .andExpect(jsonPath("$.openDepartureCount").value(0));

        mvc.perform(get("/tours/da-lat-moi")).andExpect(status().isOk());
        mvc.perform(get("/tours")).andExpect(jsonPath("$.items[*].slug", contains("da-lat-moi")));
        assertThat(catalogEvents()).isEqualTo(1);
    }

    @Test
    void createdTourCanStartHidden() throws Exception {
        adminPost(PATH, request(Map.of("status", "\"HIDDEN\"")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("HIDDEN"));

        mvc.perform(get("/tours/da-lat-moi")).andExpect(status().isNotFound());
    }

    @Test
    void createCannotStartDeleted() throws Exception {
        adminPost(PATH, request(Map.of("status", "\"DELETED\""))).andExpect(status().isBadRequest());

        assertThat(count("SELECT count(*) FROM tours")).isZero();
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "durationNights | 4 | durationNights",
            "durationDays | 0 | durationDays",
            "durationDays | 366 | durationDays",
            "durationNights | -1 | durationNights",
            "slug | \"featured\" | slug",
            "slug | \"Da Lat\" | slug",
            "slug | \"da--lat\" | slug",
            "title | \" \" | title",
            "destinationId | 999999 | destinationId",
            "destinationId | null | destinationId",
            "departureCity | \"\" | departureCity",
            "coverImageUrl | \"https://xau.com/a.jpg\" | coverImageUrl",
            "coverImageAlt | \"\" | coverImageAlt",
            "featured | null | featured" })
    void invalidValueIsReportedOnItsField(String field, String json, String errorField) throws Exception {
        adminPost(PATH, request(Map.of(field, json)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field", hasItem(errorField)));

        assertThat(catalogEvents()).isZero();
    }

    @Test
    void nightsMayEqualDays() throws Exception {
        adminPost(PATH, request(Map.of("durationNights", "3"))).andExpect(status().isCreated());
    }

    @Test
    void textLongerThanItsColumnIsRejected() throws Exception {
        adminPost(PATH, request(Map.of(
                "slug", "\"" + "a".repeat(151) + "\"",
                "title", "\"" + "a".repeat(256) + "\"",
                "departureCity", "\"" + "a".repeat(101) + "\"",
                "shortDescription", "\"" + "a".repeat(501) + "\"",
                "coverImageAlt", "\"" + "a".repeat(256) + "\"",
                "coverImageUrl", "\"" + IMAGE + "a".repeat(500) + "\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field", hasItems("slug", "title", "departureCity",
                        "shortDescription", "coverImageAlt", "coverImageUrl")));

        adminPost(PATH, request(Map.of("shortDescription", "\"" + "a".repeat(500) + "\"")))
                .andExpect(status().isCreated());
    }

    @Test
    void slugStaysTakenEvenByADeletedTour() throws Exception {
        data.tour("da-lat-moi", daLat, false, "DELETED");

        adminPost(PATH, request())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("slug"));
    }

    @Test
    void updateChangesContentButNeverRatingReviewCountOrStatus() throws Exception {
        long tour = data.tour("cu", "Tên cũ", daLat, false, "HIDDEN", 4.8, 312);
        long other = data.destination("sapa", "Sapa");

        adminPut(PATH + "/" + tour, request(Map.of("destinationId", String.valueOf(other), "slug", "\"moi\"")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("moi"))
                .andExpect(jsonPath("$.destinationName").value("Sapa"))
                .andExpect(jsonPath("$.featured").value(true))
                .andExpect(jsonPath("$.status").value("HIDDEN"))
                .andExpect(jsonPath("$.rating").value(4.8))
                .andExpect(jsonPath("$.reviewCount").value(312));

        assertThat(jdbc.queryForObject("SELECT rating::text || '/' || review_count FROM tours WHERE id = ?",
                String.class, tour)).isEqualTo("4.8/312");
        assertThat(catalogEvents()).isEqualTo(1);
    }

    @Test
    void updateRejectsAnotherToursSlugButKeepsItsOwn() throws Exception {
        long tour = data.tour("mot", daLat, false, "ACTIVE");
        data.tour("hai", daLat, false, "ACTIVE");

        adminPut(PATH + "/" + tour, request(Map.of("slug", "\"hai\"")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("slug"));
        adminPut(PATH + "/" + tour, request(Map.of("slug", "\"mot\""))).andExpect(status().isOk());
        adminPut(PATH + "/999999", request()).andExpect(status().isNotFound());
    }

    @Test
    void hideAndShowMoveTheTourOffAndOnTheWebsite() throws Exception {
        data.tour("mot", daLat, false, "ACTIVE");
        long tour = jdbc.queryForObject("SELECT id FROM tours", Long.class);

        adminPatch(PATH + "/" + tour + "/status", "{\"status\":\"HIDDEN\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("HIDDEN"));
        mvc.perform(get("/tours/mot")).andExpect(status().isNotFound());

        adminPatch(PATH + "/" + tour + "/status", "{\"status\":\"ACTIVE\"}").andExpect(status().isOk());
        mvc.perform(get("/tours/mot")).andExpect(status().isOk());

        adminPatch(PATH + "/" + tour + "/status", "{\"status\":\"DELETED\"}").andExpect(status().isBadRequest());
        adminPatch(PATH + "/" + tour + "/status", "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("status"));
        assertThat(catalogEvents()).isEqualTo(2);
    }

    @Test
    void deletedTourCanOnlyBeViewedOrRestoredToHidden() throws Exception {
        long tour = data.tour("mot", daLat, false, "ACTIVE");
        long departure = data.departure(tour, "2027-01-14", 1_000_000, null, 10, 0);
        String path = PATH + "/" + tour;

        adminPost(path + "/restore", "{}").andExpect(status().isConflict());
        adminDelete(path).andExpect(status().isNoContent());

        adminGet(path).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DELETED"));
        adminDelete(path).andExpect(status().isConflict());
        adminPut(path, request()).andExpect(status().isConflict());
        // Hiện lại thẳng từ DELETED sẽ bỏ qua bước khôi phục về ẩn.
        adminPatch(path + "/status", "{\"status\":\"ACTIVE\"}").andExpect(status().isConflict());
        // Xoá mềm giữ nguyên chuyến.
        assertThat(count("SELECT count(*) FROM tour_departures WHERE id = ?", departure)).isEqualTo(1);

        adminPost(path + "/restore", "{}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("HIDDEN"));
        mvc.perform(get("/tours/mot")).andExpect(status().isNotFound());
        assertThat(catalogEvents()).isEqualTo(2);
    }

    @Test
    void missingTourIsNotFoundOnEveryOperation() throws Exception {
        adminGet(PATH + "/999999").andExpect(status().isNotFound());
        adminPatch(PATH + "/999999/status", "{\"status\":\"ACTIVE\"}").andExpect(status().isNotFound());
        adminDelete(PATH + "/999999").andExpect(status().isNotFound());
        adminPost(PATH + "/999999/restore", "{}").andExpect(status().isNotFound());
    }

    @Test
    void listHidesDeletedToursUnlessAskedAndFiltersByEveryParameter() throws Exception {
        long sapa = data.destination("sapa", "Sapa");
        data.tour("da-lat-san-may", "Đà Lạt săn mây", daLat, true, "ACTIVE", 4, 1);
        data.tour("sapa-trekking", "Sapa trekking 100%", sapa, false, "HIDDEN", 4, 1);
        data.tour("bi-xoa", "Tour đã xoá", daLat, true, "DELETED", 4, 1);

        adminGet(PATH).andExpect(jsonPath("$.items[*].slug", contains("sapa-trekking", "da-lat-san-may")))
                .andExpect(jsonPath("$.totalItems").value(2));
        adminGet(PATH + "?status=DELETED").andExpect(jsonPath("$.items[*].slug", contains("bi-xoa")));
        adminGet(PATH + "?status=HIDDEN").andExpect(jsonPath("$.items[*].slug", contains("sapa-trekking")));
        adminGet(PATH + "?destinationId=" + sapa)
                .andExpect(jsonPath("$.items[*].slug", contains("sapa-trekking")));
        adminGet(PATH + "?featured=true").andExpect(jsonPath("$.items[*].slug", contains("da-lat-san-may")));
        adminGet(PATH + "?featured=false").andExpect(jsonPath("$.items[*].slug", contains("sapa-trekking")));
        // Tìm theo tên (không phân biệt hoa thường, kể cả chữ có dấu) và theo slug.
        adminGet(PATH + "?q=đÀ LẠT").andExpect(jsonPath("$.items[*].slug", contains("da-lat-san-may")));
        adminGet(PATH + "?q=SAPA-TREK").andExpect(jsonPath("$.items[*].slug", contains("sapa-trekking")));
        // % và _ là ký tự thường, không phải ký tự đại diện. (MockMvc tự mã hoá đường dẫn nên viết thẳng "%".)
        adminGet(PATH + "?q=%").andExpect(jsonPath("$.items[*].slug", contains("sapa-trekking")));
        adminGet(PATH + "?q=_").andExpect(jsonPath("$.items", hasSize(0)));
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "NEWEST | c,b,a",
            "OLDEST | a,b,c",
            "TITLE_ASC | b,c,a",
            "TITLE_DESC | a,c,b" })
    void listSortsByTheWhitelistedOrders(String sort, String slugs) throws Exception {
        data.tour("a", "Z", daLat, false, "ACTIVE", 4, 1);
        data.tour("b", "A", daLat, false, "ACTIVE", 4, 1);
        data.tour("c", "M", daLat, false, "ACTIVE", 4, 1);

        adminGet(PATH + "?sort=" + sort).andExpect(jsonPath("$.items[*].slug", contains(slugs.split(","))));
    }

    @Test
    void listPaginatesInSqlAndClampsThePage() throws Exception {
        for (int i = 1; i <= 5; i++) {
            data.tour("tour-" + i, daLat, false, "ACTIVE");
        }

        adminGet(PATH + "?size=2&page=2")
                .andExpect(jsonPath("$.items[*].slug", contains("tour-3", "tour-2")))
                .andExpect(jsonPath("$.totalPages").value(3));
        adminGet(PATH + "?size=2&page=2147483647")
                .andExpect(jsonPath("$.page").value(3))
                .andExpect(jsonPath("$.items[*].slug", contains("tour-1")));
        adminGet(PATH + "?size=101").andExpect(status().isBadRequest());
        adminGet(PATH + "?page=0").andExpect(status().isBadRequest());
        adminGet(PATH + "?sort=KHAC").andExpect(status().isBadRequest());
        adminGet(PATH + "?destinationId=abc").andExpect(status().isBadRequest());
    }

    /** Hôm nay (25/11/2026 theo đồng hồ test) không còn là chuyến sắp tới; chuyến đóng bán không cộng vào chỗ còn. */
    @Test
    void listSummarisesUpcomingDeparturesUsingVietnamToday() throws Exception {
        long tour = data.tour("a", daLat, false, "ACTIVE");
        data.tour("khong-chuyen", daLat, false, "ACTIVE");
        data.departure(tour, "2026-11-24", 100, null, 20, 0);
        data.departure(tour, "2026-11-25", 100, null, 20, 0);
        data.departure(tour, "2026-11-26", 100, null, 20, 20);
        data.departure(tour, "2027-01-14", 100, null, 20, 5);
        long closed = data.departure(tour, "2027-02-14", 100, null, 30, 0);
        jdbc.update("UPDATE tour_departures SET sales_closed = true WHERE id = ?", closed);

        adminGet(PATH + "?sort=OLDEST")
                .andExpect(jsonPath("$.items[0].upcomingDepartureCount").value(3))
                .andExpect(jsonPath("$.items[0].nextDepartureDate").value("2026-11-26"))
                .andExpect(jsonPath("$.items[0].remainingSeats").value(15))
                .andExpect(jsonPath("$.items[1].upcomingDepartureCount").value(0))
                .andExpect(jsonPath("$.items[1].nextDepartureDate").value(nullValue()))
                .andExpect(jsonPath("$.items[1].remainingSeats").value(0));
        // Chỉ chuyến 14/01 khách còn đặt được.
        adminGet(PATH + "/" + tour).andExpect(jsonPath("$.openDepartureCount").value(1));
    }

    @Test
    void createdTourAndItsRatingAreReadBackFromTheDetailEndpoint() throws Exception {
        int created = id(body(adminPost(PATH, request())));

        adminGet(PATH + "/" + created)
                .andExpect(jsonPath("$.departureCity").value("TP. Hồ Chí Minh"))
                .andExpect(jsonPath("$.coverImageAlt").value("Rừng thông"))
                .andExpect(jsonPath("$.shortDescription").value("Giới thiệu"));
        adminGet(PATH).andExpect(jsonPath("$.items[*].slug", containsInAnyOrder("da-lat-moi")))
                .andExpect(jsonPath("$.items[*].slug", not(hasItem("featured"))));
    }

    @ParameterizedTest
    @CsvSource({ "GET, /admin/tours", "GET, /admin/tours/1", "POST, /admin/tours", "PUT, /admin/tours/1",
            "PATCH, /admin/tours/1/status", "DELETE, /admin/tours/1", "POST, /admin/tours/1/restore" })
    void onlyStaffMayUseTheseEndpoints(String method, String path) throws Exception {
        var customer = client.customer();
        newRequestBoundary();

        client.send(HttpMethod.valueOf(method), path, null, request()).andExpect(status().isUnauthorized());
        client.send(HttpMethod.valueOf(method), path, customer.token(), request()).andExpect(status().isForbidden());
    }
}
