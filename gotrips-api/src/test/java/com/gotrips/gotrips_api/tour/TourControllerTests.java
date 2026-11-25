package com.gotrips.gotrips_api.tour;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import com.gotrips.gotrips_api.support.CatalogApiTest;

/** GET /tours/featured. "Hôm nay" cố định là 25/11/2026 (xem TestcontainersConfiguration). */
class TourControllerTests extends CatalogApiTest {

    @Test
    void featuredIsPublicAndEmptyWithoutData() throws Exception {
        mvc.perform(get("/tours/featured"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void featuredKeepsOnlyActiveFeaturedToursWithABookableDeparture() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");

        // Tour có chuyến đặt được nhưng tour khác điều kiện nên phải bị loại.
        long noBookable = data.tour("het-chuyen", destination, true, "ACTIVE");
        data.departure(noBookable, "2026-11-25", 100, null, 20, 0); // hôm nay: chưa đặt được
        data.departure(noBookable, "2026-11-01", 100, null, 20, 0); // đã qua
        data.departure(noBookable, "2027-01-10", 100, null, 20, 20); // đã đầy

        long hidden = data.tour("bi-an", destination, true, "HIDDEN");
        data.departure(hidden, "2027-01-10", 100, null, 20, 0);

        long notFeatured = data.tour("khong-noi-bat", destination, false, "ACTIVE");
        data.departure(notFeatured, "2027-01-10", 100, null, 20, 0);

        long shown = data.tour("hien-thi", destination, true, "ACTIVE");
        data.departure(shown, "2027-01-10", 300, null, 20, 11);
        data.departure(shown, "2027-02-10", 200, null, 20, 6);

        mvc.perform(get("/tours/featured"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(shown))
                .andExpect(jsonPath("$[0].slug").value("hien-thi"))
                .andExpect(jsonPath("$[0].destinationName").value("Đà Lạt"))
                .andExpect(jsonPath("$[0].destinationSlug").value("da-lat"));
    }

    @Test
    void featuredComputesTheDerivedFieldsAgainstAFixedToday() throws Exception {
        long destination = data.destination("phu-quoc", "Phú Quốc");
        long tour = data.tour("phu-quoc-4n3d", destination, true, "ACTIVE");
        data.departure(tour, "2027-01-14", 8_990_000, 10_990_000L, 24, 14); // gần nhất, còn 10 chỗ
        data.departure(tour, "2027-02-25", 9_490_000, 11_490_000L, 24, 20);
        data.departure(tour, "2027-04-08", 8_490_000, 10_490_000L, 24, 9); // rẻ nhất

        mvc.perform(get("/tours/featured"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$[0].durationDays").value(3))
                .andExpect(jsonPath("$[0].durationNights").value(2))
                .andExpect(jsonPath("$[0].departureCity").value("TP. Hồ Chí Minh"))
                .andExpect(jsonPath("$[0].rating").value(4.5))
                .andExpect(jsonPath("$[0].reviewCount").value(10))
                .andExpect(jsonPath("$[0].nextDepartureDate").value("2027-01-14"))
                .andExpect(jsonPath("$[0].seatsLeft").value(10))
                .andExpect(jsonPath("$[0].priceFrom").value(8_490_000))
                .andExpect(jsonPath("$[0].originalPriceFrom").value(10_490_000))
                .andExpect(jsonPath("$[0].discountPercent").value(19))
                // Khoá JSON phải đúng tên isAlmostFull (Jackson dễ đổi thành almostFull với boolean "is...").
                .andExpect(jsonPath("$[0].isAlmostFull").value(false));
    }

    @Test
    void featuredMarksAlmostFullAndOmitsDiscountWhenThereIsNone() throws Exception {
        long destination = data.destination("ha-long", "Hạ Long");
        long tour = data.tour("ha-long-2n1d", destination, true, "ACTIVE");
        data.departure(tour, "2027-01-17", 3_890_000, null, 20, 17); // còn 3 chỗ

        mvc.perform(get("/tours/featured"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].seatsLeft").value(3))
                .andExpect(jsonPath("$[0].isAlmostFull").value(true))
                .andExpect(jsonPath("$[0].originalPriceFrom").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$[0].discountPercent").value(org.hamcrest.Matchers.nullValue()));
    }

    @Test
    void featuredOrdersById() throws Exception {
        long destination = data.destination("sapa", "Sapa");
        long first = data.tour("tour-a", destination, true, "ACTIVE");
        long second = data.tour("tour-b", destination, true, "ACTIVE");
        data.departure(second, "2027-01-10", 100, null, 20, 0);
        data.departure(first, "2027-03-10", 900, null, 20, 0);

        mvc.perform(get("/tours/featured"))
                .andExpect(jsonPath("$[0].id").value(first))
                .andExpect(jsonPath("$[1].id").value(second));
    }

    @Test
    void limitIsAppliedAfterDroppingToursWithoutBookableDepartures() throws Exception {
        long destination = data.destination("hoi-an", "Hội An");
        // Tour id nhỏ nhất không còn chuyến: nếu cắt limit trước khi lọc thì kết quả sẽ rỗng.
        long soldOut = data.tour("het-cho", destination, true, "ACTIVE");
        data.departure(soldOut, "2027-01-10", 100, null, 20, 20);
        long bookable = data.tour("con-cho", destination, true, "ACTIVE");
        data.departure(bookable, "2027-01-10", 100, null, 20, 0);
        long another = data.tour("con-cho-2", destination, true, "ACTIVE");
        data.departure(another, "2027-01-10", 100, null, 20, 0);

        mvc.perform(get("/tours/featured").param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(bookable));
    }

    @Test
    void defaultLimitIsEight() throws Exception {
        long destination = data.destination("nha-trang", "Nha Trang");
        for (int i = 1; i <= 10; i++) {
            long tour = data.tour("tour-" + i, destination, true, "ACTIVE");
            data.departure(tour, "2027-01-10", 100, null, 20, 0);
        }

        mvc.perform(get("/tours/featured"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(8)));
    }
}
