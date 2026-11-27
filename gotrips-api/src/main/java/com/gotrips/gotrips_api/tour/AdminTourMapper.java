package com.gotrips.gotrips_api.tour;

import java.time.LocalDate;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.gotrips.gotrips_api.config.MapStructConfig;

@Mapper(config = MapStructConfig.class)
public interface AdminTourMapper {

    /** Ba số liệu chuyến là số suy ra nên truyền riêng. Tour phải được tải kèm điểm đến. */
    @Mapping(target = "id", source = "tour.id")
    @Mapping(target = "destinationId", source = "tour.destination.id")
    @Mapping(target = "destinationName", source = "tour.destination.name")
    AdminTourSummaryResponse toSummary(Tour tour, long upcomingDepartureCount, LocalDate nextDepartureDate,
            long remainingSeats);

    @Mapping(target = "id", source = "tour.id")
    @Mapping(target = "destinationId", source = "tour.destination.id")
    @Mapping(target = "destinationName", source = "tour.destination.name")
    AdminTourDetailResponse toDetail(Tour tour, int openDepartureCount);
}
