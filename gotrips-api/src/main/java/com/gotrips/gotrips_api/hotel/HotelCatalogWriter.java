package com.gotrips.gotrips_api.hotel;

import java.util.List;

import org.springframework.stereotype.Component;

import com.gotrips.gotrips_api.common.catalog.AdminImageRequest;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;

/**
 * Thay TOÀN BỘ tiện ích hoặc bộ ảnh của một khách sạn/loại phòng: xoá theo chủ bằng một câu lệnh rồi chèn bộ mới, thứ
 * tự trong danh sách là {@code sort_order}. Nơi gọi phải đang giữ khoá dòng khách sạn và KHÔNG được nạp các dòng cũ
 * trong cùng giao dịch trước đó.
 *
 * <p>Chèn bằng {@code persist} chứ không {@code save()}: dòng nối có khoá gán sẵn nên {@code save()} gọi {@code merge},
 * vốn tốn thêm một câu SELECT mỗi dòng và có thể im lặng không INSERT nếu một bản cũ còn trong persistence context.
 */
@Component
@RequiredArgsConstructor
class HotelCatalogWriter {

    private final HotelAmenityRepository hotelAmenities;
    private final HotelImageRepository hotelImages;
    private final HotelRoomTypeAmenityRepository roomTypeAmenities;
    private final HotelRoomTypeImageRepository roomTypeImages;
    private final EntityManager entityManager;

    void replaceHotelAmenities(long hotelId, List<Amenity> amenities) {
        hotelAmenities.deleteAllOfHotel(hotelId);
        amenities.forEach(amenity -> entityManager.persist(new HotelAmenity(hotelId, amenity)));
    }

    void replaceHotelImages(long hotelId, List<AdminImageRequest> images) {
        hotelImages.deleteAllOfHotel(hotelId);
        for (int order = 0; order < images.size(); order++) {
            AdminImageRequest image = images.get(order);
            entityManager.persist(new HotelImage(hotelId, image.url(), image.alt(), order));
        }
    }

    void replaceRoomTypeAmenities(long roomTypeId, List<Amenity> amenities) {
        roomTypeAmenities.deleteAllOfRoomType(roomTypeId);
        amenities.forEach(amenity -> entityManager.persist(new HotelRoomTypeAmenity(roomTypeId, amenity)));
    }

    void replaceRoomTypeImages(long roomTypeId, List<AdminImageRequest> images) {
        roomTypeImages.deleteAllOfRoomType(roomTypeId);
        for (int order = 0; order < images.size(); order++) {
            AdminImageRequest image = images.get(order);
            entityManager.persist(new HotelRoomTypeImage(roomTypeId, image.url(), image.alt(), order));
        }
    }
}
