package com.gotrips.gotrips_api.destination;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.gotrips.gotrips_api.config.MapStructConfig;

@Mapper(config = MapStructConfig.class)
public interface DestinationMapper {

    /** {@code tourCount} là số suy ra (không nằm trên entity) nên truyền riêng. */
    @Mapping(target = "tourCount", source = "tourCount")
    DestinationResponse toResponse(Destination destination, long tourCount);
}
