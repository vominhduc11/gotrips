package com.gotrips.gotrips_api.hotel;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.gotrips.gotrips_api.common.catalog.ImageResponse;
import com.gotrips.gotrips_api.config.MapStructConfig;

@Mapper(config = MapStructConfig.class)
public interface AdminHotelMapper {

    AdminAmenityResponse toAmenity(Amenity amenity);

    /** Số loại phòng, giá từ và cờ hiện trên website là số suy ra nên truyền riêng. Khách sạn phải tải được điểm đến. */
    @Mapping(target = "id", source = "hotel.id")
    @Mapping(target = "name", source = "hotel.name")
    @Mapping(target = "destinationId", source = "hotel.destination.id")
    @Mapping(target = "destinationName", source = "hotel.destination.name")
    AdminHotelSummaryResponse toSummary(Hotel hotel, long roomTypeCount, long sellingRoomTypeCount, Long minPricePerNight,
            boolean visibleOnWebsite);

    @Mapping(target = "id", source = "hotel.id")
    @Mapping(target = "name", source = "hotel.name")
    @Mapping(target = "destinationId", source = "hotel.destination.id")
    @Mapping(target = "destinationName", source = "hotel.destination.name")
    @Mapping(target = "amenities", source = "amenities")
    @Mapping(target = "images", source = "images")
    @Mapping(target = "checkInTime", source = "hotel.checkInTime", dateFormat = "HH:mm")
    @Mapping(target = "checkOutTime", source = "hotel.checkOutTime", dateFormat = "HH:mm")
    AdminHotelDetailResponse toDetail(Hotel hotel, List<AmenityResponse> amenities, List<ImageResponse> images,
            long roomTypeCount, long sellingRoomTypeCount, Long minPricePerNight, boolean visibleOnWebsite);

    @Mapping(target = "id", source = "roomType.id")
    @Mapping(target = "name", source = "roomType.name")
    @Mapping(target = "amenities", source = "amenities")
    @Mapping(target = "images", source = "images")
    AdminRoomTypeResponse toRoomType(HotelRoomType roomType, List<AmenityResponse> amenities,
            List<ImageResponse> images, int minimumTotalRooms, boolean deletable);
}
