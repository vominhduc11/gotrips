package com.gotrips.gotrips_api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.catalog.CatalogImageUrls;

/**
 * Dữ liệu mẫu (profile {@code seed}, file {@code db/seed/R__seed_catalog.sql}): kiểm các giá trị CỐ ĐỊNH (điểm đến,
 * tour, khách sạn, sân bay, chặng bay, lịch bay, đánh giá) với "hôm nay" cố định 25/11/2026. Dùng cho dev/Docker và
 * e2e của web, nên sửa seed phải sửa test này. Chạy trên context riêng (profile khác) nên có container PostgreSQL
 * riêng, đã nạp sẵn seed.
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

    @Autowired
    private CatalogImageUrls imageUrls;

    @ParameterizedTest
    @CsvSource({
        "admin@gotrips.test, GoTripsDevAdmin26, ADMIN",
        "staff@gotrips.test, GoTripsDevStaff26, STAFF"
    })
    void seededAdminAccountsCanSignIn(String email, String password, String role) throws Exception {
        var csrf = mvc.perform(get("/admin/auth/me")).andExpect(status().isUnauthorized())
                .andReturn().getResponse().getCookie("XSRF-TOKEN");
        mvc.perform(post("/admin/auth/login").cookie(csrf).header("X-XSRF-TOKEN", csrf.getValue())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s","password":"%s"}""".formatted(email, password)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles", contains(role)));
    }

    @Test
    void destinationsIncludeTourCountsOfActiveToursOnly() throws Exception {
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
    void airportsAreListedInPopularityOrder() throws Exception {
        mvc.perform(get("/airports"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code", contains("SGN", "HAN", "DAD", "CXR", "PQC", "DLI", "HPH", "VDO", "HUI",
                        "VII", "UIH", "VCA")))
                .andExpect(jsonPath("$[0].name").value("Sân bay Tân Sơn Nhất"))
                .andExpect(jsonPath("$[0].city").value("TP. Hồ Chí Minh"));
    }

    @Test
    void featuredToursAreComputedAgainstAFixedToday() throws Exception {
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
    void featuredHotelsAreOrderedByRatingWithMinimumPrices() throws Exception {
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
    void hotelDetailIsSeeded() throws Exception {
        // Khách sạn 1 (Đồi Mây): mô tả, tiện ích, bộ ảnh, giờ nhận/trả và hai loại phòng (sắp giá tăng).
        mvc.perform(get("/hotels/khach-san-doi-may-da-lat"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Khách sạn Đồi Mây"))
                .andExpect(jsonPath("$.destinationSlug").value("da-lat"))
                .andExpect(jsonPath("$.minPricePerNight").value(1_250_000))
                .andExpect(jsonPath("$.description", startsWith("Khách sạn nằm trên đồi thông yên tĩnh")))
                // Nét riêng của chuỗi tiện ích cũ nay nằm trong phần giới thiệu.
                .andExpect(jsonPath("$.description", containsString("hồ bơi nước ấm")))
                .andExpect(jsonPath("$.description", containsString("đưa đón sân bay (có phí)")))
                .andExpect(jsonPath("$.amenities[*].code",
                        contains("pool", "breakfast", "wifi", "parking", "airport-shuttle")))
                .andExpect(jsonPath("$.amenities[*].name",
                        contains("Hồ bơi", "Bữa sáng", "Wi-Fi", "Bãi đỗ xe", "Đưa đón sân bay")))
                .andExpect(jsonPath("$.images", hasSize(4)))
                .andExpect(jsonPath("$.images[0].url")
                        .value("https://images.unsplash.com/photo-1529290130-4ca3753253ae?auto=format&fit=crop&w=1600&q=75"))
                .andExpect(jsonPath("$.images[0].alt").value("Hồ bơi trong nhà với khu ghế nghỉ và vách gỗ"))
                .andExpect(jsonPath("$.roomTypes[0].images", hasSize(2)))
                .andExpect(jsonPath("$.roomTypes[0].amenities[*].code",
                        contains("wifi", "tv", "kettle", "bathtub", "safe")))
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

    /** Chuyển từ chuỗi tự do sang danh mục không được thêm hay bớt tiện ích của khách sạn nào. */
    @Test
    void seededHotelAmenitiesKeepTheMeaningOfTheOldFreeText() {
        assertThat(jdbc.queryForList("SELECT ha.hotel_id || ':' || string_agg(a.code, ',' ORDER BY a.code) "
                + "FROM hotel_amenities ha JOIN amenities a ON a.id = ha.amenity_id "
                + "GROUP BY ha.hotel_id ORDER BY ha.hotel_id", String.class)).containsExactly(
                "1:airport-shuttle,breakfast,parking,pool,wifi",
                "2:breakfast,garden-bbq,motorbike-rental,wifi",
                "3:beach,kids-club,pool,restaurant,spa",
                "4:bar,breakfast,pool,wifi",
                "5:gym,pool,restaurant,tour-desk",
                "6:fireplace,restaurant,tour-desk,wifi",
                "7:bicycle,breakfast,pool",
                "8:beach,pool,spa");
    }

    /** Khoá ngoại ở bảng nối không ép được {@code scope} nên seed phải tự tuân thủ. */
    @Test
    void seededAmenitiesAreOnlyAttachedWhereTheirScopeAllows() {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM amenities", Integer.class)).isEqualTo(23);
        assertThat(count("FROM hotel_amenities l JOIN amenities a ON a.id = l.amenity_id WHERE a.scope = 'ROOM'"))
                .isZero();
        assertThat(count("FROM hotel_room_type_amenities l JOIN amenities a ON a.id = l.amenity_id "
                + "WHERE a.scope = 'HOTEL'")).isZero();
    }

    @Test
    void everySeededHotelAndRoomTypeHasEnoughImagesAndAmenities() {
        assertThat(count("FROM hotels h WHERE (SELECT count(*) FROM hotel_images i WHERE i.hotel_id = h.id) "
                + "NOT BETWEEN 3 AND 5")).isZero();
        assertThat(count("FROM hotel_room_types r WHERE (SELECT count(*) FROM hotel_room_type_images i "
                + "WHERE i.room_type_id = r.id) NOT BETWEEN 1 AND 3")).isZero();
        // Số lượng sai cũng là dấu hiệu gõ sai code: câu INSERT nối theo code sẽ bỏ dòng đó mà không báo lỗi.
        assertThat(count("FROM hotel_room_types r WHERE (SELECT count(*) FROM hotel_room_type_amenities l "
                + "WHERE l.room_type_id = r.id) NOT BETWEEN 3 AND 6")).isZero();
    }

    @Test
    void seededGalleryImagesDoNotRepeatAndPassTheSameUrlRuleAsTheAdminApi() {
        // Bộ ảnh xem thêm không lặp lại ảnh đại diện, và một chủ không có hai ảnh giống nhau.
        assertThat(count("FROM hotel_images i JOIN hotels h ON h.id = i.hotel_id WHERE i.image_url = h.image_url"))
                .isZero();
        assertThat(count("FROM (SELECT 1 FROM hotel_images GROUP BY hotel_id, image_url HAVING count(*) > 1) d"))
                .isZero();
        assertThat(count("FROM (SELECT 1 FROM hotel_room_type_images GROUP BY room_type_id, image_url "
                + "HAVING count(*) > 1) d")).isZero();
        assertThat(count("FROM (SELECT image_alt FROM hotel_images UNION ALL "
                + "SELECT image_alt FROM hotel_room_type_images) i WHERE btrim(image_alt) = ''")).isZero();
        // URL ngoài `images.remotePatterns` của web làm `next/image` không tải được ảnh.
        jdbc.queryForList("SELECT image_url FROM hotel_images UNION SELECT image_url FROM hotel_room_type_images",
                String.class).forEach(url -> imageUrls.require("imageUrl", url));
    }

    /**
     * Flyway chạy lại file seed trên DB dev cũ mỗi khi file đổi: lần chạy lại không được lỗi và không được nhân đôi
     * dòng nào (đặc biệt bảng ảnh có id tự sinh, chỉ UNIQUE (chủ, sort_order) chặn trùng).
     */
    @Test
    @Transactional
    void rerunningTheSeedDoesNotDuplicateAnything() throws Exception {
        String script = new ClassPathResource("db/seed/R__seed_catalog.sql")
                .getContentAsString(StandardCharsets.UTF_8);
        List<Long> before = seededRowCounts();

        jdbc.execute(script);

        assertThat(seededRowCounts()).isEqualTo(before);
    }

    private List<Long> seededRowCounts() {
        return Stream.of("destinations", "tours", "tour_departures", "hotels", "hotel_room_types", "amenities",
                        "hotel_amenities", "hotel_room_type_amenities", "hotel_images", "hotel_room_type_images",
                        "testimonials", "flight_schedules")
                .map(table -> count("FROM " + table))
                .toList();
    }

    private long count(String fromClause) {
        return jdbc.queryForObject("SELECT count(*) " + fromClause, Long.class);
    }

    @Test
    void hiddenHotelDetailIsNotFound() throws Exception {
        mvc.perform(get("/hotels/resort-bien-xanh-nha-trang")).andExpect(status().isNotFound());
    }

    @Test
    void hotelSearchOverTheSeed() throws Exception {
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
    void popularFlightRoutesAreSeeded() throws Exception {
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
    void testimonialsAreSeeded() throws Exception {
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
    void airlinesAndFlightSchedulesAreSeeded() {
        assertThat(jdbc.queryForList("SELECT code || '|' || name FROM airlines ORDER BY code", String.class))
                .containsExactly("CD|Cánh Diều Air", "MT|Mây Trời Airlines", "SV|Sao Việt Air");
        assertThat(jdbc.queryForList("SELECT concat_ws('|', id, airline_code, flight_number, from_code, to_code, "
                + "to_char(depart_time, 'HH24:MI'), duration_minutes, economy_fare) FROM flight_schedules ORDER BY id",
                String.class)).containsExactly(
                "1|SV|SV201|SGN|HAN|06:00|125|1690000",
                "2|MT|MT113|SGN|HAN|08:30|125|1490000",
                "3|CD|CD305|SGN|HAN|13:15|130|1390000",
                "4|SV|SV219|SGN|HAN|19:45|125|1590000",
                "5|MT|MT114|HAN|SGN|06:30|125|1450000",
                "6|SV|SV202|HAN|SGN|09:00|125|1650000",
                "7|CD|CD306|HAN|SGN|15:40|130|1350000",
                "8|SV|SV220|HAN|SGN|21:00|125|1550000",
                "9|SV|SV121|SGN|DAD|07:10|85|1090000",
                "10|CD|CD221|SGN|DAD|11:20|85|990000",
                "11|MT|MT131|SGN|DAD|17:30|90|1050000",
                "12|CD|CD222|DAD|SGN|09:00|85|950000",
                "13|SV|SV122|DAD|SGN|14:25|85|1050000",
                "14|MT|MT132|DAD|SGN|20:10|90|1000000",
                "15|MT|MT151|SGN|PQC|06:45|60|890000",
                "16|SV|SV151|SGN|PQC|12:00|60|950000",
                "17|MT|MT152|PQC|SGN|08:30|60|870000",
                "18|SV|SV152|PQC|SGN|16:20|60|930000",
                "19|CD|CD171|SGN|CXR|07:30|65|790000",
                "20|SV|SV171|SGN|CXR|15:00|65|850000",
                "21|CD|CD172|CXR|SGN|10:00|65|770000",
                "22|SV|SV172|CXR|SGN|17:20|65|830000",
                "23|MT|MT181|SGN|DLI|09:15|55|750000",
                "24|CD|CD181|SGN|DLI|14:40|55|720000",
                "25|MT|MT182|DLI|SGN|11:10|55|730000",
                "26|CD|CD182|DLI|SGN|16:30|55|710000",
                "27|SV|SV211|HAN|DAD|07:00|80|1150000",
                "28|CD|CD211|HAN|DAD|18:20|80|990000",
                "29|SV|SV212|DAD|HAN|09:30|80|1100000",
                "30|CD|CD212|DAD|HAN|20:40|80|960000",
                "31|MT|MT235|HAN|PQC|08:00|130|1790000",
                "32|SV|SV236|HAN|PQC|22:30|130|1690000",
                "33|MT|MT236|PQC|HAN|11:30|130|1750000",
                "34|SV|SV237|PQC|HAN|18:00|130|1650000",
                "35|CD|CD241|HAN|CXR|10:10|120|1590000",
                "36|CD|CD242|CXR|HAN|13:20|120|1550000");
        // Mỗi lịch bay mỗi ngày: phổ thông 150, phổ thông đặc biệt 24, thương gia 16, hạng nhất 8.
        assertThat(jdbc.queryForObject("SELECT count(*) FROM flight_schedules WHERE economy_seats = 150 "
                + "AND premium_economy_seats = 24 AND business_seats = 16 AND first_seats = 8", Integer.class))
                .isEqualTo(36);
    }

    @Test
    void flightSearchOverTheSeededSchedules() throws Exception {
        mvc.perform(get("/flights").param("from", "SGN").param("to", "HAN").param("date", "2027-06-10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].flightNumber", contains("SV201", "MT113", "CD305", "SV219")))
                .andExpect(jsonPath("$[1].airline.name").value("Mây Trời Airlines"))
                .andExpect(jsonPath("$[1].fares.adult").value(1_490_000))
                .andExpect(jsonPath("$[1].seatsLeft").value(150));
        // SV236 (22:30) hạ cánh 00:40 hôm sau.
        mvc.perform(get("/flights").param("from", "HAN").param("to", "PQC").param("date", "2027-06-10"))
                .andExpect(jsonPath("$[*].flightNumber", contains("MT235", "SV236")))
                .andExpect(jsonPath("$[1].arriveTime").value("00:40"))
                .andExpect(jsonPath("$[1].arrivesNextDay").value(true));
    }

    @Test
    void roomCountsAreSeeded() {
        assertThat(jdbc.queryForList("SELECT total_rooms FROM hotel_room_types ORDER BY id", Integer.class))
                .containsExactly(12, 6, 10, 8, 20, 15, 4, 14, 10, 16, 10, 12, 8, 14, 6, 10, 5);
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

        Long scheduleId = jdbc.queryForObject("INSERT INTO flight_schedules (airline_code, flight_number, from_code, "
                + "to_code, depart_time, duration_minutes, economy_fare, economy_seats, premium_economy_seats, "
                + "business_seats, first_seats) VALUES ('SV', 'SV999', 'SGN', 'HAN', TIME '23:00', 120, 1000000, "
                + "1, 0, 0, 0) RETURNING id", Long.class);
        assertThat(scheduleId).isEqualTo(37L);

        Long amenityId = jdbc.queryForObject("INSERT INTO amenities (code, name, scope) "
                + "VALUES ('tien-ich-moi', 'Tiện ích mới', 'BOTH') RETURNING id", Long.class);
        assertThat(amenityId).isEqualTo(24L);
    }
}
