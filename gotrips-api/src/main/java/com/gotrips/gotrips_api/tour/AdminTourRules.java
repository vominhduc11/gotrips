package com.gotrips.gotrips_api.tour;

import java.util.Set;

/**
 * Giới hạn và câu báo lỗi của form tour. Khớp {@code tour-form-schema.ts} của gotrips-admin: đổi một nơi phải đổi nơi
 * kia.
 */
final class AdminTourRules {

    static final int SLUG_MAX_LENGTH = 150;
    static final int TITLE_MAX_LENGTH = 255;
    static final int DEPARTURE_CITY_MAX_LENGTH = 100;
    static final int SHORT_DESCRIPTION_MAX_LENGTH = 500;
    static final int IMAGE_URL_MAX_LENGTH = 500;
    static final int IMAGE_ALT_MAX_LENGTH = 255;
    static final int MAX_DURATION = 365;

    static final String SLUG_REQUIRED = "Vui lòng nhập slug.";
    static final String SLUG_TOO_LONG = "Slug không được quá 150 ký tự.";
    static final String TITLE_REQUIRED = "Vui lòng nhập tên tour.";
    static final String TITLE_TOO_LONG = "Tên tour không được quá 255 ký tự.";
    static final String DESTINATION_REQUIRED = "Vui lòng chọn điểm đến.";
    static final String DAYS_REQUIRED = "Vui lòng nhập số ngày.";
    static final String DAYS_RANGE = "Số ngày phải từ 1 đến 365.";
    static final String NIGHTS_REQUIRED = "Vui lòng nhập số đêm.";
    static final String NIGHTS_RANGE = "Số đêm phải từ 0 đến 365.";
    static final String NIGHTS_OVER_DAYS = "Số đêm không được lớn hơn số ngày.";
    static final String CITY_REQUIRED = "Vui lòng nhập nơi khởi hành.";
    static final String CITY_TOO_LONG = "Nơi khởi hành không được quá 100 ký tự.";
    static final String DESCRIPTION_REQUIRED = "Vui lòng nhập giới thiệu ngắn.";
    static final String DESCRIPTION_TOO_LONG = "Giới thiệu ngắn không được quá 500 ký tự.";
    static final String IMAGE_URL_REQUIRED = "Vui lòng nhập địa chỉ ảnh.";
    static final String IMAGE_URL_TOO_LONG = "Địa chỉ ảnh không được quá 500 ký tự.";
    static final String IMAGE_ALT_REQUIRED = "Vui lòng nhập mô tả ảnh.";
    static final String IMAGE_ALT_TOO_LONG = "Mô tả ảnh không được quá 255 ký tự.";
    static final String FEATURED_REQUIRED = "Vui lòng chọn có nổi bật hay không.";

    /** {@code GET /tours/featured} là endpoint danh sách, nên tour mang slug này sẽ không bao giờ mở được. */
    static final Set<String> RESERVED_SLUGS = Set.of("featured");
    static final String SLUG_RESERVED = "Slug này được hệ thống dùng riêng. Hãy chọn slug khác.";

    private AdminTourRules() {
    }

    static String strip(String value) {
        return value == null ? null : value.strip();
    }
}
