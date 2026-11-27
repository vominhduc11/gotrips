package com.gotrips.gotrips_api.destination;

import org.mapstruct.Mapper;

import com.gotrips.gotrips_api.config.MapStructConfig;

@Mapper(config = MapStructConfig.class)
public interface AdminDestinationMapper {

    /** Hai số tham chiếu là số suy ra (không nằm trên entity) nên truyền riêng. */
    AdminDestinationResponse toResponse(Destination destination, long tourCount, long hotelCount);
}
