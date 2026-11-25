package com.gotrips.gotrips_api.hotel;

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
}
