package com.gotrips.gotrips_api.hotel;

import java.time.LocalTime;
import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.gotrips.gotrips_api.config.MapStructConfig;

@Mapper(config = MapStructConfig.class)
public interface HotelMapper {

    /** {@code minPricePerNight} là số suy ra (nhỏ nhất của các loại phòng) nên truyền riêng. */
    @Mapping(target = "destinationName", source = "hotel.destination.name")
    @Mapping(target = "destinationSlug", source = "hotel.destination.slug")
    @Mapping(target = "minPricePerNight", source = "minPricePerNight")
    HotelCardResponse toCard(Hotel hotel, long minPricePerNight);

    HotelRoomTypeResponse toRoomType(HotelRoomType roomType);

    List<HotelRoomTypeResponse> toRoomTypes(List<HotelRoomType> roomTypes);

    /**
     * Các trường của thẻ được chép sang theo tên ({@code target = "."}); phần còn lại truyền riêng vì không nằm trên
     * thẻ. Giờ nhận/trả phòng chuyển thành chuỗi "HH:mm" để web in nguyên (Jackson mặc định ra "14:00:00").
     */
    @Mapping(target = ".", source = "card")
    @Mapping(target = "description", source = "description")
    @Mapping(target = "amenities", source = "amenities")
    @Mapping(target = "checkInTime", source = "checkInTime", dateFormat = "HH:mm")
    @Mapping(target = "checkOutTime", source = "checkOutTime", dateFormat = "HH:mm")
    @Mapping(target = "roomTypes", source = "roomTypes")
    HotelDetailResponse toDetail(HotelCardResponse card, String description, List<String> amenities,
            LocalTime checkInTime, LocalTime checkOutTime, List<HotelRoomTypeResponse> roomTypes);

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
