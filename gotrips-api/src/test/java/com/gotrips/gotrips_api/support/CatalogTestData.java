package com.gotrips.gotrips_api.support;

import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Dựng dữ liệu danh mục cho test bằng SQL thuần. Không dùng repository vì entity của danh mục chỉ để ĐỌC (chưa map
 * hết các cột bắt buộc như mô tả, tiện ích). Test gọi lớp này trong transaction của test nên dữ liệu tự rollback.
 * Mỗi hàm trả id vừa tạo (hoặc không trả gì với khoá chính là mã).
 */
public class CatalogTestData {

    private final JdbcTemplate jdbc;

    public CatalogTestData(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long destination(String slug, String name) {
        return insert("INSERT INTO destinations (slug, name, region, image_url, image_alt) VALUES (?, ?, 'Vùng', ?, ?) "
                + "RETURNING id", slug, name, "https://img.test/" + slug + ".jpg", "Ảnh " + name);
    }

    /** Tour mặc định rating 4.5 / 10 đánh giá, ACTIVE. {@code status}: "ACTIVE" hoặc "HIDDEN". */
    public long tour(String slug, long destinationId, boolean featured, String status) {
        return insert("INSERT INTO tours (slug, title, destination_id, duration_days, duration_nights, departure_city, "
                + "short_description, cover_image_url, cover_image_alt, rating, review_count, is_featured, status) "
                + "VALUES (?, ?, ?, 3, 2, 'TP. Hồ Chí Minh', 'Mô tả', ?, ?, 4.5, 10, ?, ?) RETURNING id",
                slug, "Tour " + slug, destinationId, "https://img.test/" + slug + ".jpg", "Ảnh " + slug, featured, status);
    }

    public long departure(long tourId, String date, long price, Long originalPrice, int totalSeats, int bookedSeats) {
        return insert("INSERT INTO tour_departures (tour_id, departure_date, price, original_price, total_seats, "
                + "booked_seats) VALUES (?, DATE '" + date + "', ?, ?, ?, ?) RETURNING id",
                tourId, price, originalPrice, totalSeats, bookedSeats);
    }

    public long hotel(String slug, long destinationId, String status, double rating, int reviewCount) {
        return insert("INSERT INTO hotels (slug, name, destination_id, star_rating, area, image_url, image_alt, status, "
                + "rating, review_count, description, amenities) "
                + "VALUES (?, ?, ?, 4, 'Khu vực', ?, ?, ?, ?, ?, 'Giới thiệu', ARRAY['Wi-Fi']::text[]) RETURNING id",
                slug, "Khách sạn " + slug, destinationId, "https://img.test/" + slug + ".jpg", "Ảnh " + slug, status,
                rating, reviewCount);
    }

    public long room(long hotelId, long pricePerNight) {
        return insert("INSERT INTO hotel_room_types (hotel_id, name, price_per_night, max_guests, bed_type, area_m2) "
                + "VALUES (?, 'Phòng', ?, 2, '1 giường đôi', 25) RETURNING id", hotelId, pricePerNight);
    }

    public void airport(String code, String name, String city, int sortOrder) {
        jdbc.update("INSERT INTO airports (code, name, city, sort_order) VALUES (?, ?, ?, ?)", code, name, city, sortOrder);
    }

    public long route(String fromCode, String toCode, int sortOrder) {
        return insert("INSERT INTO flight_routes (from_code, to_code, duration_minutes, reference_price, image_url, "
                + "image_alt, sort_order) VALUES (?, ?, 90, 1000000, ?, ?, ?) RETURNING id",
                fromCode, toCode, "https://img.test/" + fromCode + toCode + ".jpg", "Ảnh " + toCode, sortOrder);
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
