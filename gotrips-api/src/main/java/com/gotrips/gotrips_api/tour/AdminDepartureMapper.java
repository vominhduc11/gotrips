package com.gotrips.gotrips_api.tour;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.gotrips.gotrips_api.config.MapStructConfig;

@Mapper(config = MapStructConfig.class)
public interface AdminDepartureMapper {

    @Mapping(target = ".", source = "view")
    @Mapping(target = "id", source = "departure.id")
    AdminDepartureResponse toResponse(TourDeparture departure, AdminDepartureRules.View view);
}
