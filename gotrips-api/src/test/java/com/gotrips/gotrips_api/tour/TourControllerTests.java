package com.gotrips.gotrips_api.tour;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.http.MediaType;

import com.gotrips.gotrips_api.support.CatalogApiTest;

/** GET /tours/featured, GET /tours (tìm) và GET /tours/{slug}. "Hôm nay" cố định là 25/11/2026 (xem TestcontainersConfiguration). */
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

    // --- GET /tours (tìm tour) ---

    @Test
    void searchIsPublicAndEmptyWithoutData() throws Exception {
        mvc.perform(get("/tours"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)))
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.pageCount").value(1))
                .andExpect(jsonPath("$.destinationName").value(nullValue()));
    }

    @Test
    void searchListsActiveToursOnlyAndKeepsSoldOutOnesAtTheEnd() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        long soldOut = data.tour("het-cho", destination, true, "ACTIVE");
        data.departure(soldOut, "2027-01-10", 100, null, 20, 20);
        long hidden = data.tour("bi-an", destination, true, "HIDDEN");
        data.departure(hidden, "2027-01-10", 100, null, 20, 0);
        long open = data.tour("con-cho", destination, false, "ACTIVE");
        data.departure(open, "2027-01-10", 500, null, 20, 0);

        mvc.perform(get("/tours"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items[0].id").value(open))
                .andExpect(jsonPath("$.items[1].id").value(soldOut))
                .andExpect(jsonPath("$.items[1].priceFrom").value(nullValue()))
                .andExpect(jsonPath("$.items[1].nextDepartureDate").value(nullValue()));
    }

    @Test
    void searchByDestinationSlugReturnsTheDestinationNameAndOnlyItsTours() throws Exception {
        long daLat = data.destination("da-lat", "Đà Lạt");
        long phuQuoc = data.destination("phu-quoc", "Phú Quốc");
        long inDaLat = data.tour("da-lat-1", daLat, false, "ACTIVE");
        data.departure(inDaLat, "2027-01-10", 100, null, 20, 0);
        data.tour("da-lat-an", daLat, false, "HIDDEN"); // tour ẩn không bao giờ hiện
        data.tour("phu-quoc-1", phuQuoc, false, "ACTIVE");

        mvc.perform(get("/tours").param("destination", "da-lat"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(inDaLat))
                .andExpect(jsonPath("$.destinationName").value("Đà Lạt"));
    }

    @Test
    void searchByADestinationWithoutToursStillNamesTheDestination() throws Exception {
        data.destination("sapa", "Sapa");

        // Điểm đến có thật nhưng chưa có tour: trang hiện "Tour Sapa" + trạng thái rỗng (khác slug sai).
        mvc.perform(get("/tours").param("destination", "sapa"))
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.destinationName").value("Sapa"));
    }

    @Test
    void searchWithAnUnknownDestinationSlugFindsNothingInsteadOfIgnoringTheFilter() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        data.tour("da-lat-1", destination, false, "ACTIVE");

        mvc.perform(get("/tours").param("destination", "khong-co"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.destinationName").value(nullValue()));
    }

    @Test
    void searchByTextIgnoresAccents() throws Exception {
        long daLat = data.destination("da-lat", "Đà Lạt");
        long phuQuoc = data.destination("phu-quoc", "Phú Quốc");
        long found = data.tour("a", "Hành trình ngàn hoa", daLat, false, "ACTIVE", 4.5, 10);
        data.tour("b", "Đảo ngọc", phuQuoc, false, "ACTIVE", 4.5, 10);

        mvc.perform(get("/tours").param("q", "DA LAT"))
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].id").value(found));
        mvc.perform(get("/tours").param("q", "   "))
                .andExpect(jsonPath("$.total").value(2));
    }

    @Test
    void searchByDateAndGuestsUsesOnlyTheMatchingDepartures() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        long tour = data.tour("da-lat-1", destination, false, "ACTIVE");
        data.departure(tour, "2027-01-10", 100, null, 20, 18); // rẻ nhất nhưng chỉ còn 2 chỗ
        data.departure(tour, "2027-02-10", 300, null, 20, 0);
        long other = data.tour("da-lat-2", destination, false, "ACTIVE");
        data.departure(other, "2027-03-10", 50, null, 20, 0);

        mvc.perform(get("/tours").param("date", "2027-02-10"))
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].id").value(tour))
                .andExpect(jsonPath("$.items[0].priceFrom").value(300));
        mvc.perform(get("/tours").param("guests", "5").param("destination", "da-lat"))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[?(@.id==" + tour + ")].priceFrom").value(300));
        mvc.perform(get("/tours").param("guests", "50"))
                .andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void searchSortsAndPaginatesWithEightToursPerPage() throws Exception {
        long destination = data.destination("sapa", "Sapa");
        long cheapest = 0;
        for (int i = 1; i <= 10; i++) {
            long tour = data.tour("tour-" + i, destination, false, "ACTIVE");
            // Tour càng về sau càng rẻ: tour 10 rẻ nhất.
            data.departure(tour, "2027-01-10", 1_000L - i * 10L, null, 20, 0);
            cheapest = tour;
        }

        mvc.perform(get("/tours").param("sort", "PRICE_ASC"))
                .andExpect(jsonPath("$.items", hasSize(8)))
                .andExpect(jsonPath("$.items[0].id").value(cheapest))
                .andExpect(jsonPath("$.total").value(10))
                .andExpect(jsonPath("$.pageCount").value(2));
        mvc.perform(get("/tours").param("sort", "PRICE_ASC").param("page", "2"))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.page").value(2));
        // Trang quá lớn được kẹp về trang cuối chứ không trả trang rỗng hay lỗi.
        mvc.perform(get("/tours").param("page", "999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(2))
                .andExpect(jsonPath("$.items", hasSize(2)));
    }

    @ParameterizedTest
    @CsvSource({ "guests, 0", "guests, 51", "guests, abc", "page, 0", "page, -1", "page, abc", "date, 2027-13-01",
            "date, 10/01/2027", "sort, price", "sort, price_asc" })
    void searchRejectsInvalidParametersWithFieldErrors(String name, String value) throws Exception {
        mvc.perform(get("/tours").param(name, value))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors[0].field").value(name))
                .andExpect(jsonPath("$.errors[0].message").isNotEmpty());
    }

    @Test
    void searchRejectsOverlongText() throws Exception {
        mvc.perform(get("/tours").param("q", "x".repeat(101)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("q"));
        mvc.perform(get("/tours").param("destination", "x".repeat(101)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("destination"));
    }

    // --- GET /tours/{slug} (chi tiết) ---

    @Test
    void detailReturnsTheCardFieldsTheDescriptionDeparturesAndReviews() throws Exception {
        long destination = data.destination("phu-quoc", "Phú Quốc");
        long tour = data.tour("phu-quoc-4n3d", destination, true, "ACTIVE");
        data.departure(tour, "2026-11-20", 1, null, 20, 0); // đã qua: không hiện
        data.departure(tour, "2026-11-25", 1, null, 20, 0); // hôm nay: không hiện
        data.departure(tour, "2027-04-08", 8_490_000, 10_490_000L, 24, 9); // rẻ nhất, xếp sau
        data.departure(tour, "2027-01-14", 8_990_000, null, 24, 19); // gần nhất, còn 5 chỗ
        data.departure(tour, "2027-02-01", 100, null, 20, 20); // đã đầy: vẫn hiện, nhưng không tính vào giá từ
        long review = data.testimonial(tour, "Nguyễn Minh Anh");
        long otherTour = data.tour("khac", destination, false, "ACTIVE");
        data.testimonial(otherTour, "Người khác");

        mvc.perform(get("/tours/phu-quoc-4n3d"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.id").value(tour))
                .andExpect(jsonPath("$.slug").value("phu-quoc-4n3d"))
                .andExpect(jsonPath("$.destinationName").value("Phú Quốc"))
                .andExpect(jsonPath("$.shortDescription").value("Mô tả"))
                .andExpect(jsonPath("$.nextDepartureDate").value("2027-01-14"))
                .andExpect(jsonPath("$.seatsLeft").value(5))
                .andExpect(jsonPath("$.isAlmostFull").value(true))
                .andExpect(jsonPath("$.priceFrom").value(8_490_000))
                .andExpect(jsonPath("$.originalPriceFrom").value(10_490_000))
                .andExpect(jsonPath("$.discountPercent").value(19))
                .andExpect(jsonPath("$.departures", hasSize(3)))
                .andExpect(jsonPath("$.departures[0].departureDate").value("2027-01-14"))
                .andExpect(jsonPath("$.departures[1].departureDate").value("2027-02-01"))
                .andExpect(jsonPath("$.departures[1].isSoldOut").value(true))
                .andExpect(jsonPath("$.departures[1].seatsLeft").value(0))
                .andExpect(jsonPath("$.departures[1].isAlmostFull").value(false))
                .andExpect(jsonPath("$.departures[2].departureDate").value("2027-04-08"))
                .andExpect(jsonPath("$.departures[2].price").value(8_490_000))
                .andExpect(jsonPath("$.departures[2].originalPrice").value(10_490_000))
                .andExpect(jsonPath("$.departures[2].discountPercent").value(19))
                .andExpect(jsonPath("$.departures[0].originalPrice").value(nullValue()))
                .andExpect(jsonPath("$.testimonials", hasSize(1)))
                .andExpect(jsonPath("$.testimonials[0].id").value(review))
                .andExpect(jsonPath("$.testimonials[0].tourId").value(tour))
                .andExpect(jsonPath("$.testimonials[0].customerName").value("Nguyễn Minh Anh"))
                .andExpect(jsonPath("$.testimonials[0].rating").value(5));
    }

    @Test
    void detailOfATourWithoutDeparturesHasEmptyListsAndNoPrice() throws Exception {
        long destination = data.destination("sapa", "Sapa");
        data.tour("sapa-trong", destination, false, "ACTIVE");

        mvc.perform(get("/tours/sapa-trong"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.departures", hasSize(0)))
                .andExpect(jsonPath("$.testimonials", hasSize(0)))
                .andExpect(jsonPath("$.priceFrom").value(nullValue()))
                .andExpect(jsonPath("$.nextDepartureDate").value(nullValue()));
    }

    @Test
    void detailIsNotFoundForUnknownAndHiddenToursWithTheSameResponse() throws Exception {
        long destination = data.destination("sapa", "Sapa");
        data.tour("bi-an", destination, true, "HIDDEN");

        // Tour đang ẩn không được phân biệt với tour không tồn tại (không lộ ra là có).
        for (String slug : new String[] { "bi-an", "khong-ton-tai" }) {
            mvc.perform(get("/tours/" + slug))
                    .andExpect(status().isNotFound())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.status").value(404))
                    .andExpect(jsonPath("$.detail").value("Không tìm thấy tour này."));
        }
    }
}
