package com.gotrips.gotrips_api.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;

/**
 * Phạm vi công khai của API danh mục: đúng các đường dẫn cần cho Trang chủ, không hơn; và luật {@code limit}
 * dùng chung của ba danh sách có giới hạn.
 */
class PublicEndpointsTests extends CatalogApiTest {

    @ParameterizedTest
    @ValueSource(strings = { "/destinations", "/airports", "/tours", "/tours/featured", "/hotels/featured",
            "/flight-routes/popular", "/testimonials" })
    void publicListsAreReachableWithoutAToken(String path) throws Exception {
        mvc.perform(get(path)).andExpect(status().isOk());
    }

    @Test
    void aTourDetailIsReachableWithoutATokenAndAnUnknownOneIsNotFoundRatherThanUnauthorized() throws Exception {
        // 404 (chứ không phải 401) chứng minh /tours/{slug} đã được mở công khai.
        mvc.perform(get("/tours/khong-ton-tai")).andExpect(status().isNotFound());
    }

    @Test
    void aHotelDetailIsReachableWithoutATokenAndAnUnknownOneIsNotFoundRatherThanUnauthorized() throws Exception {
        // 404 (chứ không phải 401) chứng minh /hotels/{slug} đã được mở công khai.
        mvc.perform(get("/hotels/khong-ton-tai")).andExpect(status().isNotFound());
    }

    @Test
    void hotelSearchIsReachableWithoutATokenAndMissingParametersAreABadRequestRatherThanUnauthorized() throws Exception {
        // 400 (chứ không phải 401) chứng minh GET /hotels đã được mở công khai.
        mvc.perform(get("/hotels")).andExpect(status().isBadRequest());
    }

    @ParameterizedTest
    @ValueSource(strings = { "/flight-routes", "/destinations/1", "/airports/HAN",
            "/testimonials/1", "/newsletter/subscriptions", "/tours/featured/extra", "/tours/some-slug/book",
            "/tours/some-slug/departures", "/hotels/featured/extra", "/hotels/some-slug/book",
            "/hotels/some-slug/rooms" })
    void otherPathsStayProtected(String path) throws Exception {
        // Mở đúng từng đường dẫn chứ không mở cả nhánh: các đường dẫn khác (kể cả bên dưới /tours/{slug} và
        // /hotels/{slug}) vẫn đòi token.
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @CsvSource({ "/tours/featured, 0", "/tours/featured, 51", "/tours/featured, -3", "/tours/featured, abc",
            "/hotels/featured, 0", "/hotels/featured, 51", "/hotels/featured, abc",
            "/flight-routes/popular, 0", "/flight-routes/popular, 51", "/flight-routes/popular, abc" })
    void invalidLimitIsRejectedWithProblemDetailAndFieldErrors(String path, String limit) throws Exception {
        mvc.perform(get(path).param("limit", limit))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors[0].field").value("limit"))
                .andExpect(jsonPath("$.errors[0].message").isNotEmpty());
    }

    @ParameterizedTest
    @CsvSource({ "/tours/featured, 1", "/tours/featured, 50", "/hotels/featured, 1", "/hotels/featured, 50",
            "/flight-routes/popular, 1", "/flight-routes/popular, 50" })
    void limitBoundariesAreAccepted(String path, String limit) throws Exception {
        mvc.perform(get(path).param("limit", limit)).andExpect(status().isOk());
    }

    @Test
    void postingNewsletterWithoutATokenIsNotRejectedByTheSecurityLayer() throws Exception {
        // Hợp lệ ⇒ 204; chứng minh không bị chặn 401 (hợp đồng chi tiết nằm ở NewsletterControllerTests).
        mvc.perform(post("/newsletter/subscriptions").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"khach@example.com\"}"))
                .andExpect(status().isNoContent());
    }
}
