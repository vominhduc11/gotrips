package com.gotrips.gotrips_api.support;

import org.springframework.jdbc.core.JdbcTemplate;

import lombok.RequiredArgsConstructor;

/**
 * Dựng dữ liệu danh mục cho test bằng SQL thuần. Không dùng repository vì entity của danh mục chỉ để ĐỌC (chưa map
 * hết các cột bắt buộc). Test gọi lớp này trong transaction của test nên dữ liệu tự rollback.
 * Mỗi hàm trả id vừa tạo (hoặc không trả gì với khoá chính là mã).
 */
@RequiredArgsConstructor
public class CatalogTestData {

    private final JdbcTemplate jdbc;

    public long destination(String slug, String name) {
        return insert("INSERT INTO destinations (slug, name, region, image_url, image_alt) VALUES (?, ?, 'Vùng', ?, ?) "
                + "RETURNING id", slug, name, "https://img.test/" + slug + ".jpg", "Ảnh " + name);
    }

    /** Tour mặc định rating 4.5 / 10 đánh giá, ACTIVE. {@code status}: "ACTIVE" hoặc "HIDDEN". */
    public long tour(String slug, long destinationId, boolean featured, String status) {
        return tour(slug, "Tour " + slug, destinationId, featured, status, 4.5, 10);
    }

    /** Như trên nhưng đặt được tên tour, điểm đánh giá và số đánh giá (để kiểm thử tìm kiếm và sắp xếp). */
    public long tour(String slug, String title, long destinationId, boolean featured, String status, double rating,
            int reviewCount) {
        return insert("INSERT INTO tours (slug, title, destination_id, duration_days, duration_nights, departure_city, "
                + "short_description, cover_image_url, cover_image_alt, rating, review_count, is_featured, status) "
                + "VALUES (?, ?, ?, 3, 2, 'TP. Hồ Chí Minh', 'Mô tả', ?, ?, ?, ?, ?, ?) RETURNING id",
                slug, title, destinationId, "https://img.test/" + slug + ".jpg", "Ảnh " + slug, rating, reviewCount,
                featured, status);
    }

    public long departure(long tourId, String date, long price, Long originalPrice, int totalSeats, int bookedSeats) {
        return insert("INSERT INTO tour_departures (tour_id, departure_date, price, original_price, total_seats, "
                + "booked_seats) VALUES (?, DATE '" + date + "', ?, ?, ?, ?) RETURNING id",
                tourId, price, originalPrice, totalSeats, bookedSeats);
    }

    /**
     * Khách sạn không kèm tiện ích hay ảnh xem thêm. Cố ý không tạo dòng nào trong {@code amenities}: test không
     * {@code @Transactional} commit dữ liệu thật, bảng danh mục không được dọn sẽ làm trùng {@code code} ở test sau.
     */
    public long hotel(String slug, long destinationId, String status, double rating, int reviewCount) {
        return insert("INSERT INTO hotels (slug, name, destination_id, star_rating, area, image_url, image_alt, status, "
                + "rating, review_count, description) "
                + "VALUES (?, ?, ?, 4, 'Khu vực', ?, ?, ?, ?, ?, 'Giới thiệu') RETURNING id",
                slug, "Khách sạn " + slug, destinationId, "https://img.test/" + slug + ".jpg", "Ảnh " + slug, status,
                rating, reviewCount);
    }

    /** {@code scope}: "HOTEL", "ROOM" hoặc "BOTH". */
    public long amenity(String code, String name, String scope, int sortOrder) {
        return insert("INSERT INTO amenities (code, name, scope, sort_order) VALUES (?, ?, ?, ?) RETURNING id",
                code, name, scope, sortOrder);
    }

    public void hotelAmenity(long hotelId, long amenityId) {
        jdbc.update("INSERT INTO hotel_amenities (hotel_id, amenity_id) VALUES (?, ?)", hotelId, amenityId);
    }

    public void roomAmenity(long roomTypeId, long amenityId) {
        jdbc.update("INSERT INTO hotel_room_type_amenities (room_type_id, amenity_id) VALUES (?, ?)", roomTypeId,
                amenityId);
    }

    /** Ảnh xem thêm của khách sạn; URL là {@code https://img.test/<name>.jpg}, alt là "Ảnh <name>". */
    public void hotelImage(long hotelId, String name, int sortOrder) {
        jdbc.update("INSERT INTO hotel_images (hotel_id, image_url, image_alt, sort_order) VALUES (?, ?, ?, ?)",
                hotelId, "https://img.test/" + name + ".jpg", "Ảnh " + name, sortOrder);
    }

    /** Như {@link #hotelImage} nhưng cho loại phòng. */
    public void roomImage(long roomTypeId, String name, int sortOrder) {
        jdbc.update("INSERT INTO hotel_room_type_images (room_type_id, image_url, image_alt, sort_order) "
                + "VALUES (?, ?, ?, ?)", roomTypeId, "https://img.test/" + name + ".jpg", "Ảnh " + name, sortOrder);
    }

    /** Loại phòng mặc định "Phòng", tối đa 2 khách mỗi phòng. */
    public long room(long hotelId, long pricePerNight) {
        return room(hotelId, "Phòng", pricePerNight, 2);
    }

    /** Như trên nhưng đặt được tên và sức chứa mỗi phòng (để kiểm thử tìm phòng đủ chỗ). */
    public long room(long hotelId, String name, long pricePerNight, int maxGuests) {
        return insert("INSERT INTO hotel_room_types (hotel_id, name, price_per_night, max_guests, bed_type, area_m2) "
                + "VALUES (?, ?, ?, ?, '1 giường đôi', 25) RETURNING id", hotelId, name, pricePerNight, maxGuests);
    }

    /** Đặt giới thiệu và giờ nhận/trả phòng ("HH:mm") của khách sạn (để kiểm thử trang chi tiết). */
    public void hotelDetails(long hotelId, String description, String checkInTime, String checkOutTime) {
        jdbc.update("UPDATE hotels SET description = ?, check_in_time = TIME '" + checkInTime
                + "', check_out_time = TIME '" + checkOutTime + "' WHERE id = ?", description, hotelId);
    }

    public void airport(String code, String name, String city, int sortOrder) {
        jdbc.update("INSERT INTO airports (code, name, city, sort_order) VALUES (?, ?, ?, ?)", code, name, city, sortOrder);
    }

    public long route(String fromCode, String toCode, int sortOrder) {
        return insert("INSERT INTO flight_routes (from_code, to_code, duration_minutes, reference_price, image_url, "
                + "image_alt, sort_order) VALUES (?, ?, 90, 1000000, ?, ?, ?) RETURNING id",
                fromCode, toCode, "https://img.test/" + fromCode + toCode + ".jpg", "Ảnh " + toCode, sortOrder);
    }

    public void totalRooms(long roomTypeId, int totalRooms) {
        jdbc.update("UPDATE hotel_room_types SET total_rooms = ? WHERE id = ?", totalRooms, roomTypeId);
    }

    public void airline(String code, String name) {
        jdbc.update("INSERT INTO airlines (code, name) VALUES (?, ?)", code, name);
    }

    /** Lịch bay có số ghế mặc định như seed: phổ thông 150, phổ thông đặc biệt 24, thương gia 16, hạng nhất 8. */
    public long schedule(String airlineCode, String flightNumber, String fromCode, String toCode, String departTime,
            int durationMinutes, long economyFare) {
        return schedule(airlineCode, flightNumber, fromCode, toCode, departTime, durationMinutes, economyFare, 150);
    }

    /** Như trên nhưng đặt được số ghế phổ thông (để kiểm thử hết ghế). */
    public long schedule(String airlineCode, String flightNumber, String fromCode, String toCode, String departTime,
            int durationMinutes, long economyFare, int economySeats) {
        return insert("INSERT INTO flight_schedules (airline_code, flight_number, from_code, to_code, depart_time, "
                + "duration_minutes, economy_fare, economy_seats, premium_economy_seats, business_seats, first_seats) "
                + "VALUES (?, ?, ?, ?, TIME '" + departTime + "', ?, ?, ?, 24, 16, 8) RETURNING id",
                airlineCode, flightNumber, fromCode, toCode, durationMinutes, economyFare, economySeats);
    }

    public long testimonial(long tourId, String customerName) {
        return insert("INSERT INTO testimonials (tour_id, customer_name, customer_city, rating, content) "
                + "VALUES (?, ?, 'Hà Nội', 5, 'Rất hài lòng') RETURNING id", tourId, customerName);
    }

    public int countNewsletterSubscriptions() {
        Integer count = jdbc.queryForObject("SELECT count(*) FROM newsletter_subscriptions", Integer.class);
        return count == null ? 0 : count;
    }

    private long insert(String sql, Object... args) {
        Long id = jdbc.queryForObject(sql, Long.class, args);
        if (id == null) {
            throw new IllegalStateException("INSERT không trả id: " + sql);
        }
        return id;
    }
}
