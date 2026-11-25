package com.gotrips.gotrips_api.flight;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.gotrips.gotrips_api.config.MapStructConfig;

@Mapper(config = MapStructConfig.class)
public interface FlightMapper {

    AirportResponse toResponse(Airport airport);

    @Mapping(target = "from", source = "fromAirport")
    @Mapping(target = "to", source = "toAirport")
    FlightRouteCardResponse toCard(FlightRoute route);
}
