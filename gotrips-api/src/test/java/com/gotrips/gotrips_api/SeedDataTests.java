package com.gotrips.gotrips_api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Dữ liệu mẫu (profile {@code seed}, file {@code db/seed/R__seed_catalog.sql}) phải khớp từng giá trị với mock của
 * gotrips-web, vì thẻ ở Trang chủ (lấy từ API) dẫn sang trang chi tiết vẫn đọc mock theo id/slug.
 * Giá trị kỳ vọng ghi cứng từ {@code lib/mock/*} với "hôm nay" cố định 25/11/2026. Chạy trên context riêng
 * (profile khác) nên có container PostgreSQL riêng, đã nạp sẵn seed.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("seed")
class SeedDataTests {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void destinationsMatchTheMockIncludingTourCounts() throws Exception {
        mvc.perform(get("/destinations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", contains(1, 2, 3, 4, 5, 6)))
                .andExpect(jsonPath("$[*].slug", contains("da-lat", "phu-quoc", "ha-long", "sapa", "hoi-an", "nha-trang")))
                // Sapa có tour 6 (ACTIVE) và tour 7 (HIDDEN, không được đếm).
                .andExpect(jsonPath("$[*].tourCount", contains(2, 1, 2, 1, 1, 1)))
                .andExpect(jsonPath("$[0].name").value("Đà Lạt"))
                .andExpect(jsonPath("$[0].region").value("Tây Nguyên"))
                .andExpect(jsonPath("$[0].imageUrl")
                        .value("https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=75"));
    }

    @Test
    void airportsMatchTheMockInPopularityOrder() throws Exception {
        mvc.perform(get("/airports"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code", contains("SGN", "HAN", "DAD", "CXR", "PQC", "DLI", "HPH", "VDO", "HUI",
                        "VII", "UIH", "VCA")))
                .andExpect(jsonPath("$[0].name").value("Sân bay Tân Sơn Nhất"))
                .andExpect(jsonPath("$[0].city").value("TP. Hồ Chí Minh"));
    }

    @Test
    void featuredToursMatchTheMockLogicAgainstAFixedToday() throws Exception {
        mvc.perform(get("/tours/featured"))
                .andExpect(status().isOk())
                // 8 tour; tour 7 (HIDDEN) bị loại.
                .andExpect(jsonPath("$[*].id", contains(1, 2, 3, 4, 5, 6, 8, 9)))
                // Tour 1: chuyến 09/01 rẻ nhất đã đầy ⇒ bỏ qua; giá từ ở chuyến 13/03, gần nhất là 23/01.
                .andExpect(jsonPath("$[0].slug").value("da-lat-3n2d-thanh-pho-ngan-hoa"))
                .andExpect(jsonPath("$[0].destinationSlug").value("da-lat"))
                .andExpect(jsonPath("$[0].rating").value(4.8))
                .andExpect(jsonPath("$[0].reviewCount").value(312))
                .andExpect(jsonPath("$[0].nextDepartureDate").value("2027-01-23"))
                .andExpect(jsonPath("$[0].seatsLeft").value(9))
                .andExpect(jsonPath("$[0].priceFrom").value(3_290_000))
                .andExpect(jsonPath("$[0].originalPriceFrom").value(nullValue()))
                .andExpect(jsonPath("$[0].discountPercent").value(nullValue()))
                .andExpect(jsonPath("$[0].isAlmostFull").value(false))
                // Tour 2.
                .andExpect(jsonPath("$[1].nextDepartureDate").value("2027-01-16"))
                .andExpect(jsonPath("$[1].seatsLeft").value(7))
                .andExpect(jsonPath("$[1].priceFrom").value(2_190_000))
                // Tour 3: đang giảm giá, giá từ ở chuyến 08/04.
                .andExpect(jsonPath("$[2].nextDepartureDate").value("2027-01-14"))
                .andExpect(jsonPath("$[2].seatsLeft").value(10))
                .andExpect(jsonPath("$[2].priceFrom").value(8_490_000))
                .andExpect(jsonPath("$[2].originalPriceFrom").value(10_490_000))
                .andExpect(jsonPath("$[2].discountPercent").value(19))
                // Tour 4.
                .andExpect(jsonPath("$[3].nextDepartureDate").value("2027-01-30"))
                .andExpect(jsonPath("$[3].seatsLeft").value(11))
                .andExpect(jsonPath("$[3].priceFrom").value(4_490_000))
                // Tour 5: chuyến gần nhất chỉ còn 3 chỗ ⇒ sắp hết chỗ.
                .andExpect(jsonPath("$[4].seatsLeft").value(3))
                .andExpect(jsonPath("$[4].priceFrom").value(3_890_000))
                .andExpect(jsonPath("$[4].isAlmostFull").value(true))
                // Tour 6.
                .andExpect(jsonPath("$[5].nextDepartureDate").value("2027-01-22"))
                .andExpect(jsonPath("$[5].priceFrom").value(3_990_000))
                // Tour 8: chuyến 18/03 đã đầy.
                .andExpect(jsonPath("$[6].nextDepartureDate").value("2027-01-21"))
                .andExpect(jsonPath("$[6].seatsLeft").value(13))
                .andExpect(jsonPath("$[6].priceFrom").value(6_290_000))
                // Tour 9.
                .andExpect(jsonPath("$[7].nextDepartureDate").value("2027-01-31"))
                .andExpect(jsonPath("$[7].priceFrom").value(4_290_000));
    }

    @Test
    void featuredHotelsMatchTheMockOrderAndMinimumPrices() throws Exception {
        mvc.perform(get("/hotels/featured"))
                .andExpect(status().isOk())
                // Điểm đánh giá 4.8, 4.7, 4.6, 4.5; khách sạn 8 (4.9) đang HIDDEN nên không có.
                .andExpect(jsonPath("$[*].id", contains(3, 7, 1, 4)))
                .andExpect(jsonPath("$[*].minPricePerNight", contains(3_200_000, 1_350_000, 1_250_000, 1_450_000)))
                .andExpect(jsonPath("$[0].slug").value("resort-bai-sao-phu-quoc"))
                .andExpect(jsonPath("$[0].destinationSlug").value("phu-quoc"))
                .andExpect(jsonPath("$[0].starRating").value(5))
                .andExpect(jsonPath("$[0].reviewCount").value(2150));
    }

    @Test
    void hotelDetailMatchesTheMock() throws Exception {
        // Khách sạn 1 (Đồi Mây): mô tả, tiện ích, giờ nhận/trả và hai loại phòng (sắp giá tăng) như lib/mock/hotels.ts.
        mvc.perform(get("/hotels/khach-san-doi-may-da-lat"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Khách sạn Đồi Mây"))
                .andExpect(jsonPath("$.destinationSlug").value("da-lat"))
                .andExpect(jsonPath("$.minPricePerNight").value(1_250_000))
                .andExpect(jsonPath("$.description", startsWith("Khách sạn nằm trên đồi thông yên tĩnh")))
                .andExpect(jsonPath("$.amenities", contains("Hồ bơi nước ấm", "Bữa sáng buffet", "Wi-Fi miễn phí",
                        "Bãi đỗ xe", "Đưa đón sân bay (có phí)")))
                .andExpect(jsonPath("$.checkInTime").value("14:00"))
                .andExpect(jsonPath("$.checkOutTime").value("12:00"))
                .andExpect(jsonPath("$.roomTypes[*].id", contains(1, 2)))
                .andExpect(jsonPath("$.roomTypes[0].name").value("Phòng Deluxe"))
                .andExpect(jsonPath("$.roomTypes[0].maxGuests").value(2))
                .andExpect(jsonPath("$.roomTypes[0].bedType").value("1 giường đôi lớn"))
                .andExpect(jsonPath("$.roomTypes[0].areaM2").value(28))
                .andExpect(jsonPath("$.roomTypes[1].pricePerNight").value(1_980_000));

        // Khách sạn 2 mở cửa lúc 14:00 và trả phòng 11:00; khách sạn 3 nhận phòng 15:00.
        mvc.perform(get("/hotels/villa-thong-xanh-da-lat"))
                .andExpect(jsonPath("$.checkOutTime").value("11:00"));
        mvc.perform(get("/hotels/resort-bai-sao-phu-quoc"))
                .andExpect(jsonPath("$.checkInTime").value("15:00"));
    }

    @Test
    void hiddenHotelDetailIsNotFound() throws Exception {
        mvc.perform(get("/hotels/resort-bien-xanh-nha-trang")).andExpect(status().isNotFound());
    }

    @Test
    void hotelSearchOverTheSeedMatchesTheWebRules() throws Exception {
        // Đà Lạt có khách sạn 1 (phòng 1.250.000/2 khách, 1.980.000/4 khách) và 2 (690.000/2, 850.000/3).
        // 2 khách, 3 đêm: Villa Thông Xanh 690.000 × 3 = 2.070.000 đứng trước Đồi Mây 1.250.000 × 3 = 3.750.000.
        mvc.perform(get("/hotels").param("destination", "da-lat").param("checkIn", "2026-12-10")
                .param("checkOut", "2026-12-13").param("guests", "2").param("rooms", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.destinationName").value("Đà Lạt"))
                .andExpect(jsonPath("$.items[*].id", contains(2, 1)))
                .andExpect(jsonPath("$.items[*].totalPrice", contains(2_070_000, 3_750_000)))
                .andExpect(jsonPath("$.items[0].room.name").value("Phòng Standard"));

        // 3 khách / 1 phòng: Villa đổi sang phòng Hướng đồi (3 khách), Đồi Mây sang phòng gia đình (4 khách).
        mvc.perform(get("/hotels").param("destination", "da-lat").param("checkIn", "2026-12-10")
                .param("checkOut", "2026-12-13").param("guests", "3").param("rooms", "1"))
                .andExpect(jsonPath("$.items[0].room.name").value("Phòng Hướng đồi"))
                .andExpect(jsonPath("$.items[0].totalPrice").value(2_550_000))
                .andExpect(jsonPath("$.items[1].room.name").value("Phòng Gia đình"));

        // Nha Trang chỉ có khách sạn HIDDEN nên không có kết quả (điểm đến vẫn tồn tại nên có tên).
        mvc.perform(get("/hotels").param("destination", "nha-trang").param("checkIn", "2026-12-10")
                .param("checkOut", "2026-12-13"))
                .andExpect(jsonPath("$.destinationName").value("Nha Trang"))
                .andExpect(jsonPath("$.items", hasSize(0)));
    }

    @Test
    void popularFlightRoutesMatchTheMock() throws Exception {
        mvc.perform(get("/flight-routes/popular"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(6)))
                .andExpect(jsonPath("$[*].id", contains(1, 2, 3, 4, 5, 6)))
                .andExpect(jsonPath("$[*].from.code", contains("SGN", "HAN", "SGN", "SGN", "SGN", "SGN")))
                .andExpect(jsonPath("$[*].to.code", contains("HAN", "SGN", "DAD", "PQC", "CXR", "DLI")))
                .andExpect(jsonPath("$[*].durationMinutes", contains(125, 125, 85, 60, 65, 55)))
                .andExpect(jsonPath("$[*].referencePrice", contains(1_390_000, 1_350_000, 990_000, 890_000, 790_000, 750_000)))
                .andExpect(jsonPath("$[0].from.name").value("Sân bay Tân Sơn Nhất"))
                .andExpect(jsonPath("$[0].to.city").value("Hà Nội"));
    }

    @Test
    void testimonialsMatchTheMock() throws Exception {
        mvc.perform(get("/testimonials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", contains(1, 2, 3, 4)))
                .andExpect(jsonPath("$[*].tourId", contains(3, 5, 1, 4)))
                .andExpect(jsonPath("$[*].customerName",
                        contains("Nguyễn Minh Anh", "Trần Quốc Bảo", "Lê Thu Hà", "Phạm Hoàng Nam")))
                .andExpect(jsonPath("$[0].tourTitle").value("Phú Quốc 4N3Đ – Đảo ngọc nghỉ dưỡng"))
                .andExpect(jsonPath("$[2].rating").value(4));
    }

    @Test
    void hiddenTourAndHotelExistInTheSeedSoTheHiddenRulesAreExercised() {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tours WHERE status = 'HIDDEN'", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM hotels WHERE status = 'HIDDEN'", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tours", Integer.class)).isEqualTo(9);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tour_departures", Integer.class)).isEqualTo(27);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM hotels", Integer.class)).isEqualTo(8);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM hotel_room_types", Integer.class)).isEqualTo(17);
    }

    /** Seed chèn id cố định; nếu không đưa sequence lên MAX(id) thì bản ghi tạo sau đó sẽ đụng khoá chính. */
    @Test
    @Transactional
    void identitySequencesContinueAfterTheSeededIds() {
        Long id = jdbc.queryForObject("INSERT INTO destinations (slug, name, region, image_url, image_alt) "
                + "VALUES ('diem-den-moi', 'Điểm đến mới', 'Vùng', 'u', 'a') RETURNING id", Long.class);

        assertThat(id).isEqualTo(7L);
    }
}
