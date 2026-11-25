package com.gotrips.gotrips_api.support;

import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Hợp đồng OpenAPI của các API danh mục. Client của web do Orval sinh từ spec này nên tên hàm (operationId), kiểu
 * tham số {@code limit} và độ "bắt buộc/nullable" của field quyết định kiểu TypeScript được sinh ra: lệch ở đây là
 * web sinh sai kiểu mà không báo lỗi lúc build API.
 */
class CatalogOpenApiTests extends CatalogApiTest {

    @ParameterizedTest
    @ValueSource(strings = { "/tours/featured", "/hotels/featured", "/flight-routes/popular" })
    void limitParameterIsAnOptionalIntegerBetween1And50(String path) throws Exception {
        String parameter = "$.paths['" + path + "'].get.parameters[0]";

        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath(parameter + ".name").value("limit"))
                .andExpect(jsonPath(parameter + ".required").value(false))
                .andExpect(jsonPath(parameter + ".schema.type").value("integer"))
                .andExpect(jsonPath(parameter + ".schema.minimum").value(1))
                .andExpect(jsonPath(parameter + ".schema.maximum").value(50));
    }

    @Test
    void operationIdsMatchTheNamesTheWebClientUses() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath("$.paths['/destinations'].get.operationId").value("listDestinations"))
                .andExpect(jsonPath("$.paths['/airports'].get.operationId").value("listAirports"))
                .andExpect(jsonPath("$.paths['/tours/featured'].get.operationId").value("listFeaturedTours"))
                .andExpect(jsonPath("$.paths['/hotels/featured'].get.operationId").value("listFeaturedHotels"))
                .andExpect(jsonPath("$.paths['/flight-routes/popular'].get.operationId")
                        .value("listPopularFlightRoutes"))
                .andExpect(jsonPath("$.paths['/testimonials'].get.operationId").value("listTestimonials"))
                .andExpect(jsonPath("$.paths['/newsletter/subscriptions'].post.operationId")
                        .value("subscribeNewsletter"));
    }

    @Test
    void tourCardFieldsAreAllRequiredAndTheDerivedOnesAreNullable() throws Exception {
        // Bắt buộc có mặt (Orval sinh `T`, không phải `T?`) nhưng được phép null (`T | null`).
        mvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath("$.components.schemas.TourCardResponse.required", hasSize(18)))
                .andExpect(jsonPath("$.components.schemas.TourCardResponse.required",
                        hasItems("nextDepartureDate", "seatsLeft", "priceFrom", "originalPriceFrom", "discountPercent",
                                "isAlmostFull")))
                .andExpect(jsonPath("$.components.schemas.TourCardResponse.properties.priceFrom.type[1]")
                        .value("null"))
                .andExpect(jsonPath("$.components.schemas.TourCardResponse.properties.isAlmostFull.type")
                        .value("boolean"));
    }
}
