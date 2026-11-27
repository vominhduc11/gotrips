package com.gotrips.gotrips_api.hotel;

import java.time.LocalTime;
import java.util.List;

import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.gotrips.gotrips_api.common.catalog.ImageResponse;
import com.gotrips.gotrips_api.config.MapStructConfig;

@Mapper(config = MapStructConfig.class)
public interface HotelMapper {

    /** {@code minPricePerNight} là số suy ra (nhỏ nhất của các loại đang bán) nên truyền riêng. */
    @Mapping(target = "destinationName", source = "hotel.destination.name")
    @Mapping(target = "destinationSlug", source = "hotel.destination.slug")
    @Mapping(target = "minPricePerNight", source = "minPricePerNight")
    HotelCardResponse toCard(Hotel hotel, long minPricePerNight);

    HotelRoomTypeResponse toRoomType(HotelRoomType roomType);

    AmenityResponse toAmenity(Amenity amenity);

    @Mapping(target = "url", source = "imageUrl")
    @Mapping(target = "alt", source = "imageAlt")
    ImageResponse toHotelImage(HotelImage image);

    @Mapping(target = "url", source = "imageUrl")
    @Mapping(target = "alt", source = "imageAlt")
    ImageResponse toRoomImage(HotelRoomTypeImage image);

    /**
     * Loại phòng ở trang chi tiết = bản gốc (chép theo tên, {@code target = "."}) + ảnh và tiện ích.
     * {@code unmappedSourcePolicy = ERROR} CHỈ cho hàm này: mặc định MapStruct bỏ qua field nguồn không dùng đến, nên
     * thiếu dòng này thì thêm field vào {@link HotelRoomTypeResponse} mà quên ở bản chi tiết vẫn build được.
     */
    @BeanMapping(unmappedSourcePolicy = ReportingPolicy.ERROR)
    @Mapping(target = ".", source = "roomType")
    @Mapping(target = "images", source = "images")
    @Mapping(target = "amenities", source = "amenities")
    HotelRoomTypeDetailResponse toRoomTypeDetail(HotelRoomTypeResponse roomType, List<ImageResponse> images,
            List<AmenityResponse> amenities);

    /**
     * Các trường của thẻ được chép sang theo tên ({@code target = "."}); phần còn lại truyền riêng vì không nằm trên
     * thẻ. Giờ nhận/trả phòng chuyển thành chuỗi "HH:mm" để web in nguyên (Jackson mặc định ra "14:00:00").
     */
    @Mapping(target = ".", source = "card")
    @Mapping(target = "description", source = "description")
    @Mapping(target = "amenities", source = "amenities")
    @Mapping(target = "images", source = "images")
    @Mapping(target = "checkInTime", source = "checkInTime", dateFormat = "HH:mm")
    @Mapping(target = "checkOutTime", source = "checkOutTime", dateFormat = "HH:mm")
    @Mapping(target = "roomTypes", source = "roomTypes")
    HotelDetailResponse toDetail(HotelCardResponse card, String description, List<AmenityResponse> amenities,
            List<ImageResponse> images, LocalTime checkInTime, LocalTime checkOutTime,
            List<HotelRoomTypeDetailResponse> roomTypes);

    // `room` cũng có `id` và `name`: chỉ rõ hai trường trùng tên này lấy từ thẻ, nếu không MapStruct báo mơ hồ.
    @Mapping(target = ".", source = "card")
    @Mapping(target = "id", source = "card.id")
    @Mapping(target = "name", source = "card.name")
    @Mapping(target = "room", source = "room")
    @Mapping(target = "nights", source = "nights")
    @Mapping(target = "rooms", source = "rooms")
    @Mapping(target = "totalPrice", source = "totalPrice")
    HotelSearchResultResponse toSearchResult(HotelCardResponse card, HotelRoomTypeResponse room, int nights, int rooms,
            long totalPrice);
}
