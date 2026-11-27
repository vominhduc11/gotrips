package com.gotrips.gotrips_api.flight;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.gotrips.gotrips_api.support.CatalogApiTest;

/** GET /flights và GET /flights/{scheduleId}. "Hôm nay" cố định là 25/11/2026. */
class FlightSearchControllerTests extends CatalogApiTest {

    private long morning;
    private long evening;
    private long sameTime;

    @BeforeEach
    void createSchedules() {
        data.airport("SGN", "Sân bay Tân Sơn Nhất", "TP. Hồ Chí Minh", 1);
        data.airport("HAN", "Sân bay Nội Bài", "Hà Nội", 2);
        data.airline("SV", "Sao Việt Air");
        evening = data.schedule("SV", "SV219", "SGN", "HAN", "19:45", 125, 1_590_000);
        morning = data.schedule("SV", "SV201", "SGN", "HAN", "06:00", 125, 1_690_000);
        sameTime = data.schedule("SV", "SV301", "SGN", "HAN", "19:45", 130, 1_390_000);
        data.schedule("SV", "SV202", "HAN", "SGN", "09:00", 125, 1_650_000);
    }

    private static MockHttpServletRequestBuilder search(Map<String, String> overrides) {
        return withParams(get("/flights"), overrides);
    }

    private static MockHttpServletRequestBuilder withParams(MockHttpServletRequestBuilder request,
            Map<String, String> overrides) {
        Map<String, String> params = new LinkedHashMap<>(Map.of("from", "SGN", "to", "HAN", "date", "2027-06-10"));
        params.putAll(overrides);
        params.forEach((name, value) -> {
            if (!value.isEmpty()) {
                request.param(name, value);
            }
        });
        return request;
    }

    @Test
    void listsTheRouteOfTheDaySortedByDepartureTimeThenId() throws Exception {
        mvc.perform(search(Map.of("cabin", "BUSINESS", "adults", "2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[*].scheduleId", contains((int) morning, (int) evening, (int) sameTime)))
                .andExpect(jsonPath("$[0].airline.code").value("SV"))
                .andExpect(jsonPath("$[0].airline.name").value("Sao Việt Air"))
                .andExpect(jsonPath("$[0].flightNumber").value("SV201"))
                .andExpect(jsonPath("$[0].from.code").value("SGN"))
                .andExpect(jsonPath("$[0].from.city").value("TP. Hồ Chí Minh"))
                .andExpect(jsonPath("$[0].to.name").value("Sân bay Nội Bài"))
                .andExpect(jsonPath("$[0].date").value("2027-06-10"))
                .andExpect(jsonPath("$[0].departTime").value("06:00"))
                .andExpect(jsonPath("$[0].arriveTime").value("08:05"))
                .andExpect(jsonPath("$[0].arrivesNextDay").value(false))
                .andExpect(jsonPath("$[0].durationMinutes").value(125))
                .andExpect(jsonPath("$[0].cabin").value("BUSINESS"))
                .andExpect(jsonPath("$[0].fares.adult").value(4_732_000))
                .andExpect(jsonPath("$[0].fares.child").value(3_549_000))
                .andExpect(jsonPath("$[0].fares.infant").value(473_000))
                .andExpect(jsonPath("$[0].seatsLeft").value(16))
                .andExpect(jsonPath("$[0].isBookable").value(true));
    }

    @Test
    void defaultsToOneAdultInEconomy() throws Exception {
        mvc.perform(search(Map.of()))
                .andExpect(jsonPath("$[0].cabin").value("ECONOMY"))
                .andExpect(jsonPath("$[0].seatsLeft").value(150))
                .andExpect(jsonPath("$[0].fares.adult").value(1_690_000));
    }

    @Test
    void todayCanBeSearchedButNotBookedOnline() throws Exception {
        mvc.perform(search(Map.of("date", "2026-11-25")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].isBookable", contains(false, false, false)));
        mvc.perform(search(Map.of("date", "2026-11-26")))
                .andExpect(jsonPath("$[0].isBookable").value(true));
    }

    @Test
    void isNotBookableWhenTheGroupNeedsMoreSeatsThanLeft() throws Exception {
        // Hạng nhất chỉ có 8 ghế; em bé không cần ghế.
        mvc.perform(search(Map.of("cabin", "FIRST", "adults", "5", "children", "4")))
                .andExpect(jsonPath("$[0].isBookable").value(false));
        mvc.perform(search(Map.of("cabin", "FIRST", "adults", "5", "children", "3", "infants", "1")))
                .andExpect(jsonPath("$[0].isBookable").value(true));
    }

    @Test
    void unknownAirportsGiveAnEmptyList() throws Exception {
        mvc.perform(search(Map.of("from", "ZZZ"))).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            to       | SGN        | to       | Điểm đến phải khác điểm đi.
            date     | 2026-11-24 | date     | Ngày đi không được ở quá khứ.
            from     | sgn        | from     | Vui lòng chọn điểm đi.
            to       | HANX       | to       | Vui lòng chọn điểm đến.
            infants  | 2          | infants  | Số em bé không được nhiều hơn số người lớn.
            children | 9          | adults   | Tổng số hành khách tối đa là 9.
            """)
    void rejectsInvalidSearches(String param, String value, String field, String message) throws Exception {
        mvc.perform(search(Map.of(param, value)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value(field))
                .andExpect(jsonPath("$.errors[0].message").value(message));
    }

    @ParameterizedTest
    @CsvSource({ "adults, 0", "adults, 10", "children, -1", "cabin, business", "cabin, KHAC", "date, 10-06-2027",
            "adults, hai" })
    void rejectsOutOfRangeAndWrongTypeParameters(String param, String value) throws Exception {
        mvc.perform(search(Map.of(param, value)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value(param));
    }

    @ParameterizedTest
    @CsvSource({ "from", "to", "date" })
    void requiresRouteAndDate(String param) throws Exception {
        mvc.perform(search(Map.of(param, "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value(param));
    }

    @Test
    void returnsOneFlightByScheduleId() throws Exception {
        mvc.perform(withParams(get("/flights/{id}", morning), Map.of("cabin", "FIRST", "adults", "9")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scheduleId").value(morning))
                .andExpect(jsonPath("$.flightNumber").value("SV201"))
                .andExpect(jsonPath("$.seatsLeft").value(8))
                .andExpect(jsonPath("$.isBookable").value(false));
    }

    @Test
    void wrongDirectionAndUnknownIdsAreNotFound() throws Exception {
        mvc.perform(withParams(get("/flights/{id}", morning), Map.of("from", "HAN", "to", "SGN")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Không tìm thấy chuyến bay này."));
        mvc.perform(withParams(get("/flights/{id}", 999_999), Map.of())).andExpect(status().isNotFound());
        mvc.perform(withParams(get("/flights/abc"), Map.of())).andExpect(status().isBadRequest());
    }
}
