package com.gotrips.gotrips_api.flight;

import static com.gotrips.gotrips_api.support.HotelRequests.id;
import static com.gotrips.gotrips_api.support.HotelRequests.json;
import static com.gotrips.gotrips_api.support.HotelRequests.with;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import com.gotrips.gotrips_api.catalog.WebCatalogChanged;
import com.gotrips.gotrips_api.support.AdminCatalogApiTest;
import com.jayway.jsonpath.JsonPath;

import jakarta.servlet.http.Cookie;

class AdminFlightCatalogTests extends AdminCatalogApiTest {

    static final String AIRLINES = "/admin/airlines";
    static final String AIRPORTS = "/admin/airports";
    static final String SCHEDULES = "/admin/flight-schedules";
    static final String ROUTES = "/admin/flight-routes";

    @BeforeEach
    void seedReferences() {
        data.airline("SV", "Hãng Sóng Việt");
        data.airline("MT", "Hãng Mây Trời");
        data.airport("SGN", "Tân Sơn Nhất", "TP. Hồ Chí Minh", 10);
        data.airport("HAN", "Nội Bài", "Hà Nội", 20);
        data.airport("DAD", "Đà Nẵng", "Đà Nẵng", 30);
    }

    static Map<String, Object> scheduleChanges() {
        return Map.of("departTime", "23:30", "durationMinutes", 100, "economyFare", 1_250_000,
                "economySeats", 50, "premiumEconomySeats", 20, "businessSeats", 15, "firstSeats", 8);
    }

    private static Map<String, Object> createSchedule() {
        var body = new LinkedHashMap<>(scheduleChanges());
        body.put("flightNumber", "SV100");
        body.put("airlineCode", "SV");
        body.put("fromCode", "SGN");
        body.put("toCode", "HAN");
        return body;
    }

    private static Map<String, Object> route(String from, String to) {
        return Map.of("fromCode", from, "toCode", to, "durationMinutes", 100,
                "referencePrice", 1_350_000, "imageUrl", IMAGE, "imageAlt", "Điểm đến");
    }

    @Test
    void requiresStaffOrAdminAndCsrfForCookieWrites() throws Exception {
        var customer = client.customer();
        for (String path : List.of(AIRLINES, AIRPORTS, SCHEDULES, ROUTES)) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
            client.getAs(path, customer.token()).andExpect(status().isForbidden());
            adminGet(path).andExpect(status().isOk());
        }
        jdbc.update("INSERT INTO user_roles (user_id, role_id) SELECT id, 3 FROM users WHERE email = ?", customer.email());
        client.getAs(SCHEDULES, customer.token()).andExpect(status().isOk());

        Cookie session = new Cookie("gotrips_admin_session", staff.token());
        Cookie csrf = mvc.perform(get("/admin/auth/me").cookie(session)).andExpect(status().isOk())
                .andReturn().getResponse().getCookie("XSRF-TOKEN");
        assertThat(csrf).isNotNull();
        String airline = json(Map.of("code", "Q9", "name", "Hãng thử"));
        mvc.perform(post(AIRLINES).cookie(session, csrf).contentType(MediaType.APPLICATION_JSON).content(airline))
                .andExpect(status().isForbidden());
        mvc.perform(post(AIRLINES).cookie(session, csrf).header("X-XSRF-TOKEN", csrf.getValue())
                .contentType(MediaType.APPLICATION_JSON).content(airline)).andExpect(status().isCreated());
    }

    @Test
    void createsAndRenamesAirlinesAndRejectsDuplicateCodes() throws Exception {
        var payload = Map.<String, Object>of("code", "9L", "name", "Hãng nội địa");
        adminPost(AIRLINES, json(payload)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("9L"));
        adminPut(AIRLINES + "/9L", json(Map.of("code", "XX", "name", "Hãng đổi tên"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("9L")).andExpect(jsonPath("$.name").value("Hãng đổi tên"));
        adminGet(AIRLINES).andExpect(jsonPath("$[*].code", contains("9L", "MT", "SV")));
        assertTags("flights", 2);
        adminPost(AIRLINES, json(payload)).andExpect(status().isConflict()).andExpect(field("code"));
    }

    @Test
    void airportSortAndNamesAreVisibleOnThePublicEndpoint() throws Exception {
        var payload = Map.<String, Object>of("code", "VDO", "name", "Vân Đồn", "city", "Quảng Ninh", "sortOrder", 0);
        adminPost(AIRPORTS, json(payload)).andExpect(status().isCreated()).andExpect(jsonPath("$.sortOrder").value(0));
        adminPut(AIRPORTS + "/VDO", json(with(payload, "name", "Sân bay Vân Đồn"))).andExpect(status().isOk());
        adminGet(AIRPORTS).andExpect(jsonPath("$[0].code").value("VDO"));
        mvc.perform(get("/airports")).andExpect(jsonPath("$[0].name").value("Sân bay Vân Đồn"))
                .andExpect(jsonPath("$[0].sortOrder").doesNotExist());
        assertTags("airports", 2);
        adminPost(AIRPORTS, json(payload)).andExpect(status().isConflict()).andExpect(field("code"));
    }

    @Test
    void schedulesUseSqlFiltersStableSortAndOneBasedPages() throws Exception {
        long first = data.schedule("SV", "SV101", "SGN", "HAN", "23:30", 100, 1_250_000);
        long second = data.schedule("SV", "SV102", "SGN", "HAN", "23:30", 100, 1_100_000);
        data.schedule("MT", "MT103", "SGN", "HAN", "23:30", 100, 1_250_000);
        data.schedule("SV", "SV104", "SGN", "DAD", "23:30", 100, 1_250_000);
        data.schedule("SV", "SV105", "HAN", "SGN", "23:30", 100, 1_250_000);

        String filters = "?airlineCode=SV&fromCode=SGN&toCode=HAN&size=1";
        adminGet(SCHEDULES + filters).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(first)).andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.page").value(1)).andExpect(jsonPath("$.totalPages").value(2));
        adminGet(SCHEDULES + filters + "&page=99").andExpect(jsonPath("$.page").value(2))
                .andExpect(jsonPath("$.items[0].id").value(second));
        adminGet(SCHEDULES + filters + "&sort=ECONOMY_FARE_ASC").andExpect(jsonPath("$.items[0].id").value(second));
        adminGet(SCHEDULES + "?airlineCode=ZZ&page=2").andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.totalPages").value(1)).andExpect(jsonPath("$.items", hasSize(0)));
        adminGet(SCHEDULES + "?sort=bad").andExpect(status().isBadRequest());
        adminGet(SCHEDULES + "?size=101").andExpect(status().isBadRequest()).andExpect(field("size"));
    }

    @Test
    void scheduleCreateUpdateAndDeleteAreReflectedInPublicSearch() throws Exception {
        long schedule = id(adminPost(SCHEDULES, json(createSchedule())).andExpect(status().isCreated())
                .andExpect(jsonPath("$.arriveTime").value("01:10"))
                .andExpect(jsonPath("$.arrivesNextDay").value(true))
                .andExpect(jsonPath("$.timingEditable").value(true)).andExpect(jsonPath("$.deletable").value(true)));
        var move = with(scheduleChanges(), "departTime", "18:30");
        adminPut(SCHEDULES + "/" + schedule, json(with(move, "flightNumber", "ZZ999"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.flightNumber").value("SV100"));
        String search = "/flights?from=SGN&to=HAN&date=2027-05-15";
        mvc.perform(get(search)).andExpect(jsonPath("$[0].departTime").value("18:30"));
        adminDelete(SCHEDULES + "/" + schedule).andExpect(status().isNoContent());
        adminGet(SCHEDULES + "/" + schedule).andExpect(status().isNotFound());
        mvc.perform(get(search)).andExpect(jsonPath("$", hasSize(0)));
        assertTags("flights", 3);
    }

    @Test
    void duplicateFlightNumberReturns409() throws Exception {
        data.schedule("SV", "SV100", "HAN", "SGN", "09:00", 100, 1_250_000);
        adminPost(SCHEDULES, json(createSchedule())).andExpect(status().isConflict()).andExpect(field("flightNumber"));
    }

    @ParameterizedTest
    @MethodSource("invalidScheduleFields")
    void scheduleErrorsPointToTheirField(String name, Object value, String field) throws Exception {
        adminPost(SCHEDULES, json(with(createSchedule(), name, value))).andExpect(status().isBadRequest())
                .andExpect(field(field));
    }

    static Stream<Arguments> invalidScheduleFields() {
        return Stream.of(
                Arguments.of("flightNumber", "SV", "flightNumber"),
                Arguments.of("flightNumber", "SV123456789", "flightNumber"),
                Arguments.of("flightNumber", "SVX", "flightNumber"),
                Arguments.of("flightNumber", "MT123", "flightNumber"),
                Arguments.of("airlineCode", "Z", "airlineCode"),
                Arguments.of("fromCode", "XYZ", "fromCode"),
                Arguments.of("toCode", "XYZ", "toCode"),
                Arguments.of("toCode", "SGN", "toCode"),
                Arguments.of("departTime", "24:00", "departTime"),
                Arguments.of("durationMinutes", 0, "durationMinutes"),
                Arguments.of("durationMinutes", 1440, "durationMinutes"),
                Arguments.of("economyFare", 0, "economyFare"),
                Arguments.of("economyFare", 1_000_000_000_001L, "economyFare"),
                Arguments.of("economySeats", -1, "economySeats"),
                Arguments.of("premiumEconomySeats", -1, "premiumEconomySeats"),
                Arguments.of("businessSeats", -1, "businessSeats"),
                Arguments.of("firstSeats", -1, "firstSeats"));
    }

    @Test
    void referenceFieldsAreValidated() throws Exception {
        adminPost(AIRLINES, json(Map.of("code", "abc", "name", "Hãng"))).andExpect(status().isBadRequest()).andExpect(field("code"));
        adminPost(AIRLINES, json(Map.of("code", "AB", "name", "A".repeat(101))))
                .andExpect(status().isBadRequest()).andExpect(field("name"));
        var airport = Map.<String, Object>of("code", "VDO", "name", "Vân Đồn", "city", "Quảng Ninh", "sortOrder", 1);
        adminPost(AIRPORTS, json(with(airport, "code", "X99"))).andExpect(status().isBadRequest()).andExpect(field("code"));
        adminPost(AIRPORTS, json(with(airport, "name", "A".repeat(151))))
                .andExpect(status().isBadRequest()).andExpect(field("name"));
        adminPost(AIRPORTS, json(with(airport, "city", "A".repeat(101))))
                .andExpect(status().isBadRequest()).andExpect(field("city"));
        adminPost(AIRPORTS, json(with(airport, "sortOrder", null))).andExpect(status().isBadRequest()).andExpect(field("sortOrder"));
    }

    @Test
    void reordersEntireListAndRejectsAnOldSnapshot() throws Exception {
        long first = id(adminPost(ROUTES, json(route("SGN", "HAN"))).andExpect(status().isCreated()));
        long second = id(adminPost(ROUTES, json(route("DAD", "HAN"))).andExpect(status().isCreated()));
        var initial = List.of(first, second);
        var reversed = List.of(second, first);
        adminPut(ROUTES + "/order", json(Map.of("expectedIds", initial, "orderedIds", List.of(second, second))))
                .andExpect(status().isBadRequest()).andExpect(field("orderedIds"));
        String reorder = json(Map.of("expectedIds", initial, "orderedIds", reversed));
        adminPut(ROUTES + "/order", reorder).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(second)).andExpect(jsonPath("$[0].sortOrder").value(1));
        mvc.perform(get("/flight-routes/popular")).andExpect(jsonPath("$[0].from.code").value("DAD"));
        adminPut(ROUTES + "/order", reorder).andExpect(status().isConflict());
        adminPut(ROUTES + "/" + first, json(with(route("HAN", "SGN"), "imageAlt", "Ảnh mới")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.imageAlt").value("Ảnh mới"));
        adminDelete(ROUTES + "/" + second).andExpect(status().isNoContent());
        adminGet(ROUTES).andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].id").value(first));
        assertTags("flight-routes", 5);
    }

    @Test
    void routesValidatePairDurationPriceAndImageAndRejectDuplicatePairs() throws Exception {
        var route = route("SGN", "HAN");
        adminPost(ROUTES, json(with(route, "toCode", "SGN"))).andExpect(status().isBadRequest()).andExpect(field("toCode"));
        adminPost(ROUTES, json(with(route, "toCode", "XYZ"))).andExpect(status().isBadRequest()).andExpect(field("toCode"));
        adminPost(ROUTES, json(with(route, "durationMinutes", 0))).andExpect(status().isBadRequest())
                .andExpect(field("durationMinutes"));
        adminPost(ROUTES, json(with(route, "referencePrice", 0))).andExpect(status().isBadRequest())
                .andExpect(field("referencePrice"));
        adminPost(ROUTES, json(with(route, "imageUrl", "https://wrong.example/photo-test")))
                .andExpect(status().isBadRequest()).andExpect(field("imageUrl"));
        adminPost(ROUTES, json(with(route, "imageAlt", "x".repeat(256)))).andExpect(status().isBadRequest())
                .andExpect(field("imageAlt"));
        adminPost(ROUTES, json(route)).andExpect(status().isCreated());
        adminPost(ROUTES, json(route)).andExpect(status().isConflict()).andExpect(field("toCode"));
    }

    @Test
    void openApiDeclaresOperationIdsRequiredFieldsAndAdminTags() throws Exception {
        ResultActions document = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
        var spec = JsonPath.parse(com.gotrips.gotrips_api.support.BookingTestClient.body(document));
        Map<String, String> operations = Map.ofEntries(
                Map.entry(AIRLINES + "|get", "listAdminAirlines"),
                Map.entry(AIRLINES + "|post", "createAdminAirline"),
                Map.entry(AIRLINES + "/{code}|put", "updateAdminAirline"),
                Map.entry(AIRPORTS + "|get", "listAdminAirports"),
                Map.entry(AIRPORTS + "|post", "createAdminAirport"),
                Map.entry(AIRPORTS + "/{code}|put", "updateAdminAirport"),
                Map.entry(SCHEDULES + "|get", "listAdminFlightSchedules"),
                Map.entry(SCHEDULES + "|post", "createAdminFlightSchedule"),
                Map.entry(SCHEDULES + "/{id}|get", "getAdminFlightSchedule"),
                Map.entry(SCHEDULES + "/{id}|put", "updateAdminFlightSchedule"),
                Map.entry(SCHEDULES + "/{id}|delete", "deleteAdminFlightSchedule"),
                Map.entry(ROUTES + "|get", "listAdminFlightRoutes"),
                Map.entry(ROUTES + "|post", "createAdminFlightRoute"),
                Map.entry(ROUTES + "/{id}|put", "updateAdminFlightRoute"),
                Map.entry(ROUTES + "/{id}|delete", "deleteAdminFlightRoute"),
                Map.entry(ROUTES + "/order|put", "updateAdminFlightRouteOrder"));
        operations.forEach((key, operationId) -> {
            String[] parts = key.split("\\|");
            String path = "$.paths['" + parts[0] + "']." + parts[1];
            assertThat(spec.<String>read(path + ".operationId")).isEqualTo(operationId);
            assertThat(spec.<String>read(path + ".tags[0]")).startsWith("Quản trị ");
            assertThat(spec.<List<Map<String, Object>>>read(path + ".security")).hasSize(2);
        });
        assertThat(spec.<List<String>>read("$.components.schemas.AdminUpdateFlightScheduleRequest.required"))
                .contains("departTime", "economyFare", "durationMinutes", "economySeats");
        assertThat(spec.<List<String>>read("$.components.schemas.AdminFlightScheduleResponse.required"))
                .contains("arriveTime", "arrivesNextDay", "timingEditable", "deletable");
        assertThat(spec.<String>read("$.components.schemas.AdminFlightScheduleResponse.properties.id.format"))
                .isEqualTo("int64");
    }

    private void assertTags(String tag, int count) {
        assertThat(events.stream(WebCatalogChanged.class).toList()).hasSize(count)
                .allSatisfy(event -> assertThat(event.tags()).containsExactly(tag));
    }

    private static org.springframework.test.web.servlet.ResultMatcher field(String name) {
        return jsonPath("$.errors[0].field").value(name);
    }
}
