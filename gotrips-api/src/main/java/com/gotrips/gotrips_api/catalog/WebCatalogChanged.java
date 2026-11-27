package com.gotrips.gotrips_api.catalog;

import java.util.List;

/** Các tag cache của website bị ảnh hưởng bởi thay đổi danh mục hoặc tồn chỗ. */
public record WebCatalogChanged(List<String> tags) {

    public static WebCatalogChanged airports() {
        return new WebCatalogChanged(List.of("airports"));
    }

    public static WebCatalogChanged flights() {
        return new WebCatalogChanged(List.of("flights"));
    }

    public static WebCatalogChanged flightRoutes() {
        return new WebCatalogChanged(List.of("flight-routes"));
    }

    public WebCatalogChanged {
        tags = List.copyOf(tags);
    }

    /**
     * Nhân viên ghi điểm đến, tour hoặc chuyến khởi hành. Dùng chung một bộ tag: thẻ tour mang tên điểm đến và giá của
     * chuyến, còn điểm đến mang số tour, nên thay đổi ở một loại làm cũ dữ liệu của loại kia.
     */
    public static WebCatalogChanged tourCatalog() {
        return new WebCatalogChanged(List.of("tours", "departures", "destinations"));
    }

    /**
     * Nhân viên ghi khách sạn hoặc loại phòng. {@code hotels} phủ thẻ, kết quả tìm và trang chi tiết (kể cả kết quả 404
     * đã cache của khách sạn chưa có phòng); {@code destinations} để dữ liệu theo điểm đến đọc lại cùng lúc.
     */
    public static WebCatalogChanged hotelCatalog() {
        return new WebCatalogChanged(List.of("hotels", "destinations"));
    }
}
