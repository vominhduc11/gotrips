package com.gotrips.gotrips_api.hotel;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import com.gotrips.gotrips_api.support.CatalogApiTest;

/** GET /hotels/featured. */
class HotelControllerTests extends CatalogApiTest {

    @Test
    void featuredIsPublicAndEmptyWithoutData() throws Exception {
        mvc.perform(get("/hotels/featured"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void featuredSkipsHiddenHotelsAndHotelsWithoutRoomTypes() throws Exception {
        long destination = data.destination("phu-quoc", "Phú Quốc");

        long hidden = data.hotel("khach-san-an", destination, "HIDDEN", 4.9, 3000);
        data.room(hidden, 3_600_000);

        data.hotel("khach-san-chua-co-phong", destination, "ACTIVE", 4.9, 3000);

        long shown = data.hotel("khach-san-hien-thi", destination, "ACTIVE", 4.5, 100);
        data.room(shown, 1_450_000);

        mvc.perform(get("/hotels/featured"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(shown))
                .andExpect(jsonPath("$[0].slug").value("khach-san-hien-thi"))
                .andExpect(jsonPath("$[0].destinationName").value("Phú Quốc"))
                .andExpect(jsonPath("$[0].destinationSlug").value("phu-quoc"))
                .andExpect(jsonPath("$[0].area").value("Khu vực"))
                .andExpect(jsonPath("$[0].starRating").value(4))
                .andExpect(jsonPath("$[0].rating").value(4.5))
                .andExpect(jsonPath("$[0].reviewCount").value(100));
    }

    @Test
    void minPricePerNightIsTheCheapestRoomType() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        long hotel = data.hotel("doi-may", destination, "ACTIVE", 4.6, 1280);
        data.room(hotel, 1_980_000);
        data.room(hotel, 1_250_000);
        data.room(hotel, 2_500_000);

        mvc.perform(get("/hotels/featured"))
                .andExpect(jsonPath("$[0].minPricePerNight").value(1_250_000));
    }

    @Test
    void featuredSortsByRatingThenReviewCountThenId() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        long fewerReviews = data.hotel("a-4-5-it", destination, "ACTIVE", 4.5, 10);
        long best = data.hotel("b-4-8", destination, "ACTIVE", 4.8, 5);
        long moreReviews = data.hotel("c-4-5-nhieu", destination, "ACTIVE", 4.5, 20);
        long sameAsFirst = data.hotel("d-4-5-it", destination, "ACTIVE", 4.5, 10);
        for (long hotel : new long[] { fewerReviews, best, moreReviews, sameAsFirst }) {
            data.room(hotel, 1_000_000);
        }

        mvc.perform(get("/hotels/featured"))
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[0].id").value(best))
                .andExpect(jsonPath("$[1].id").value(moreReviews))
                .andExpect(jsonPath("$[2].id").value(fewerReviews))
                .andExpect(jsonPath("$[3].id").value(sameAsFirst));
    }

    @Test
    void limitIsAppliedAfterTheFilterAndDefaultsToFour() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        // Khách sạn điểm cao nhất chưa có phòng: nếu cắt limit trước khi lọc, kết quả sẽ thiếu.
        data.hotel("chua-co-phong", destination, "ACTIVE", 5.0, 1);
        for (int i = 1; i <= 6; i++) {
            long hotel = data.hotel("khach-san-" + i, destination, "ACTIVE", 4.0, i);
            data.room(hotel, 1_000_000);
        }

        mvc.perform(get("/hotels/featured"))
                .andExpect(jsonPath("$", hasSize(4)));
        mvc.perform(get("/hotels/featured").param("limit", "2"))
                .andExpect(jsonPath("$", hasSize(2)));
    }
}
