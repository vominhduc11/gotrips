package com.gotrips.gotrips_api.tour;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Kiểu sắp xếp danh sách tour. Mọi kiểu đều xếp tour không còn chuyến đặt được (không có giá) xuống cuối, rồi hoà thì
 * theo id (xem {@link TourSearchCalculator}).
 */
@Schema(description = "Kiểu sắp xếp danh sách tour")
public enum TourSort {

    /** Tour nổi bật trước, rồi điểm đánh giá, rồi số đánh giá (mặc định). */
    FEATURED,
    /** Ngày khởi hành còn chỗ gần nhất trước. */
    NEAREST_DEPARTURE,
    /** "Giá từ" thấp đến cao. */
    PRICE_ASC,
    /** "Giá từ" cao đến thấp. */
    PRICE_DESC,
    /** Điểm đánh giá cao nhất, rồi nhiều đánh giá nhất. */
    RATING
}
