package com.gotrips.gotrips_api.flight;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.gotrips.gotrips_api.support.CatalogApiTest;

/** GET /airports và GET /flight-routes/popular. */
class FlightControllerTests extends CatalogApiTest {

    @BeforeEach
    void createAirports() {
        // Thứ tự chèn khác thứ tự gợi ý để chứng minh API sắp theo sort_order chứ không theo mã/thứ tự chèn.
        data.airport("HAN", "Sân bay Nội Bài", "Hà Nội", 2);
        data.airport("DAD", "Sân bay quốc tế Đà Nẵng", "Đà Nẵng", 3);
        data.airport("SGN", "Sân bay Tân Sơn Nhất", "TP. Hồ Chí Minh", 1);
    }

    @Test
    void airportsArePublicAndOrderedBySortOrder() throws Exception {
        mvc.perform(get("/airports"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].code").value("SGN"))
                .andExpect(jsonPath("$[0].name").value("Sân bay Tân Sơn Nhất"))
                .andExpect(jsonPath("$[0].city").value("TP. Hồ Chí Minh"))
                .andExpect(jsonPath("$[1].code").value("HAN"))
                .andExpect(jsonPath("$[2].code").value("DAD"));
    }

    @Test
    void popularRoutesArePublicOrderedByPopularityAndCarryBothAirports() throws Exception {
        data.route("HAN", "SGN", 2);
        long first = data.route("SGN", "HAN", 1);
        data.route("SGN", "DAD", 3);

        mvc.perform(get("/flight-routes/popular"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].id").value(first))
                .andExpect(jsonPath("$[0].from.code").value("SGN"))
                .andExpect(jsonPath("$[0].from.city").value("TP. Hồ Chí Minh"))
                .andExpect(jsonPath("$[0].to.code").value("HAN"))
                .andExpect(jsonPath("$[0].to.name").value("Sân bay Nội Bài"))
                .andExpect(jsonPath("$[0].durationMinutes").value(90))
                .andExpect(jsonPath("$[0].referencePrice").value(1_000_000))
                .andExpect(jsonPath("$[1].from.code").value("HAN"))
                .andExpect(jsonPath("$[2].to.code").value("DAD"));
    }

    @Test
    void popularRoutesRespectLimit() throws Exception {
        data.route("SGN", "HAN", 1);
        data.route("HAN", "SGN", 2);
        data.route("SGN", "DAD", 3);

        mvc.perform(get("/flight-routes/popular").param("limit", "2"))
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void databaseRejectsARouteWhoseEndsAreTheSameAirport() {
        // Luật "điểm đi khác điểm đến" nằm ở DB nên API không cần lọc lại như bên web.
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> data.route("SGN", "SGN", 9))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }
}
