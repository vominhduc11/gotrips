package com.gotrips.gotrips_api.hotel;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.gotrips.gotrips_api.catalog.CatalogImageUrls;
import com.gotrips.gotrips_api.common.catalog.AdminImageRequest;
import com.gotrips.gotrips_api.common.catalog.CatalogStatus;
import com.gotrips.gotrips_api.common.error.InvalidRequestException;

/**
 * Giới hạn và câu báo lỗi của form khách sạn và loại phòng. Khớp {@code hotel-form-schema.ts},
 * {@code room-type-form-schema.ts} và {@code image-schema.ts} của gotrips-admin: đổi một nơi phải đổi nơi kia.
 */
final class AdminHotelRules {

    static final int SLUG_MAX_LENGTH = 150;
    static final int NAME_MAX_LENGTH = 200;
    static final int AREA_MAX_LENGTH = 150;
    static final int IMAGE_URL_MAX_LENGTH = 500;
    static final int IMAGE_ALT_MAX_LENGTH = 255;
    static final int DESCRIPTION_MAX_LENGTH = 5000;
    static final int MAX_GALLERY_IMAGES = 20;
    static final int MAX_AMENITIES = 30;
    /** "HH:mm", 00:00–23:59. */
    static final String TIME_PATTERN = "^([01]\\d|2[0-3]):[0-5]\\d$";

    static final String SLUG_REQUIRED = "Vui lòng nhập slug.";
    static final String SLUG_TOO_LONG = "Slug không được quá 150 ký tự.";
    static final String NAME_REQUIRED = "Vui lòng nhập tên khách sạn.";
    static final String NAME_TOO_LONG = "Tên khách sạn không được quá 200 ký tự.";
    static final String DESTINATION_REQUIRED = "Vui lòng chọn điểm đến.";
    static final String STARS_REQUIRED = "Vui lòng chọn hạng sao.";
    static final String STARS_RANGE = "Hạng sao phải từ 1 đến 5.";
    static final String AREA_REQUIRED = "Vui lòng nhập khu vực.";
    static final String AREA_TOO_LONG = "Khu vực không được quá 150 ký tự.";
    static final String IMAGE_URL_REQUIRED = "Vui lòng nhập địa chỉ ảnh.";
    static final String IMAGE_URL_TOO_LONG = "Địa chỉ ảnh không được quá 500 ký tự.";
    static final String IMAGE_ALT_REQUIRED = "Vui lòng nhập mô tả ảnh.";
    static final String IMAGE_ALT_TOO_LONG = "Mô tả ảnh không được quá 255 ký tự.";
    static final String DESCRIPTION_REQUIRED = "Vui lòng nhập giới thiệu.";
    static final String DESCRIPTION_TOO_LONG = "Giới thiệu không được quá 5.000 ký tự.";
    static final String AMENITIES_REQUIRED = "Thiếu danh sách tiện ích.";
    static final String AMENITY_BLANK = "Mã tiện ích không được để trống.";
    static final String TOO_MANY_AMENITIES = "Chọn tối đa 30 tiện ích.";
    static final String IMAGES_REQUIRED = "Thiếu danh sách ảnh.";
    static final String TOO_MANY_IMAGES = "Bộ ảnh có tối đa 20 ảnh.";
    static final String IMAGE_MISSING = "Ảnh không được để trống.";
    static final String CHECK_IN_REQUIRED = "Vui lòng nhập giờ nhận phòng.";
    static final String CHECK_OUT_REQUIRED = "Vui lòng nhập giờ trả phòng.";
    static final String TIME_FORMAT = "Giờ phải có dạng HH:mm, ví dụ 14:00.";
    static final String IMAGE_SAME_AS_MAIN = "Bộ ảnh xem thêm không lặp lại ảnh đại diện.";
    static final String IMAGE_DUPLICATED = "Ảnh này đã có trong bộ ảnh.";

    /** {@code GET /hotels/featured} là endpoint danh sách, nên khách sạn mang slug này sẽ không bao giờ mở được. */
    static final Set<String> RESERVED_SLUGS = Set.of("featured");
    static final String SLUG_RESERVED = "Slug này được hệ thống dùng riêng. Hãy chọn slug khác.";

    // ---- Loại phòng ----

    static final int ROOM_NAME_MAX_LENGTH = 150;
    static final int BED_TYPE_MAX_LENGTH = 150;
    /** 1.000 tỷ đồng: tổng tiền lớn nhất của một đơn (30 đêm × 10 phòng) vẫn là số nguyên an toàn trong JavaScript. */
    static final long MAX_PRICE = 1_000_000_000_000L;
    static final int MAX_ROOM_AREA = 10_000;
    static final int MAX_TOTAL_ROOMS = 10_000;

    static final String ROOM_NAME_REQUIRED = "Vui lòng nhập tên loại phòng.";
    static final String ROOM_NAME_TOO_LONG = "Tên loại phòng không được quá 150 ký tự.";
    static final String PRICE_REQUIRED = "Vui lòng nhập giá mỗi đêm.";
    static final String PRICE_RANGE = "Giá mỗi đêm phải từ 1 đến 1.000.000.000.000 ₫.";
    static final String MAX_GUESTS_REQUIRED = "Vui lòng nhập số khách tối đa.";
    static final String MAX_GUESTS_RANGE = "Số khách tối đa mỗi phòng phải từ 1 đến 30.";
    static final String BED_TYPE_REQUIRED = "Vui lòng nhập loại giường.";
    static final String BED_TYPE_TOO_LONG = "Loại giường không được quá 150 ký tự.";
    static final String ROOM_AREA_REQUIRED = "Vui lòng nhập diện tích.";
    static final String ROOM_AREA_RANGE = "Diện tích phải từ 1 đến 10.000 m².";
    static final String TOTAL_ROOMS_REQUIRED = "Vui lòng nhập tổng số phòng.";
    static final String TOTAL_ROOMS_RANGE = "Tổng số phòng phải từ 0 đến 10.000.";

    private AdminHotelRules() {
    }

    /** Website chỉ hiện khách sạn đang ACTIVE và có ít nhất một loại phòng (không có phòng thì không có "giá từ"). */
    static boolean visibleOnWebsite(CatalogStatus status, long sellingRoomTypeCount) {
        return status == CatalogStatus.ACTIVE && sellingRoomTypeCount > 0;
    }

    /**
     * Kiểm bộ ảnh theo thứ tự gửi lên: URL phải thuộc danh sách cho phép, không trùng ảnh đại diện (nếu có) và không
     * trùng nhau. Lỗi gắn đúng ô {@code images[i].url}.
     */
    static void requireValidGallery(CatalogImageUrls urls, List<AdminImageRequest> images, String mainImageUrl) {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < images.size(); i++) {
            String field = "images[" + i + "].url";
            String url = images.get(i).url();
            urls.require(field, url);
            if (url.equals(mainImageUrl)) {
                throw new InvalidRequestException(field, IMAGE_SAME_AS_MAIN);
            }
            if (!seen.add(url)) {
                throw new InvalidRequestException(field, IMAGE_DUPLICATED);
            }
        }
    }

    static String strip(String value) {
        return value == null ? null : value.strip();
    }
}
