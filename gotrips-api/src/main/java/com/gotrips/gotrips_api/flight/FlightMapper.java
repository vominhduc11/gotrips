package com.gotrips.gotrips_api.flight;

import java.time.LocalDate;
import java.time.LocalTime;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.gotrips.gotrips_api.config.MapStructConfig;
import com.gotrips.gotrips_api.flight.AdminFlightReferences.AdminAirportResponse;
import com.gotrips.gotrips_api.flight.AdminFlightRouteDtos.AdminFlightRouteResponse;
import com.gotrips.gotrips_api.flight.AdminFlightScheduleDtos.AdminFlightScheduleResponse;

@Mapper(config = MapStructConfig.class)
public interface FlightMapper {

    AirportResponse toResponse(Airport airport);

    AirlineResponse toResponse(Airline airline);

    AdminAirportResponse toAdminAirport(Airport airport);

    @Mapping(target = "from", source = "fromAirport")
    @Mapping(target = "to", source = "toAirport")
    AdminFlightRouteResponse toAdminRoute(FlightRoute route);

    @Mapping(target = "from", source = "schedule.fromAirport")
    @Mapping(target = "to", source = "schedule.toAirport")
    @Mapping(target = "departTime", source = "schedule.departTime", dateFormat = "HH:mm")
    @Mapping(target = "arriveTime", source = "arriveTime", dateFormat = "HH:mm")
    AdminFlightScheduleResponse toAdminSchedule(FlightSchedule schedule, LocalTime arriveTime, boolean arrivesNextDay,
            boolean timingEditable, boolean deletable);

    @Mapping(target = "from", source = "fromAirport")
    @Mapping(target = "to", source = "toAirport")
    FlightRouteCardResponse toCard(FlightRoute route);

    /**
     * Chuyến bay = lịch bay + ngày + hạng ghế. Giá, giờ hạ cánh, ghế còn lại là số suy ra (tính ở
     * {@link FlightSearchService}) nên truyền riêng. Giờ chuyển thành chuỗi "HH:mm" để web in nguyên.
     */
    @Mapping(target = "scheduleId", source = "schedule.id")
    @Mapping(target = "airline", source = "schedule.airline")
    @Mapping(target = "flightNumber", source = "schedule.flightNumber")
    @Mapping(target = "from", source = "schedule.fromAirport")
    @Mapping(target = "to", source = "schedule.toAirport")
    @Mapping(target = "date", source = "date")
    @Mapping(target = "departTime", source = "schedule.departTime", dateFormat = "HH:mm")
    @Mapping(target = "arriveTime", source = "arriveTime", dateFormat = "HH:mm")
    @Mapping(target = "arrivesNextDay", source = "arrivesNextDay")
    @Mapping(target = "durationMinutes", source = "schedule.durationMinutes")
    @Mapping(target = "cabin", source = "cabin")
    @Mapping(target = "fares", source = "fares")
    @Mapping(target = "seatsLeft", source = "seatsLeft")
    @Mapping(target = "isBookable", source = "bookable")
    FlightOptionResponse toOption(FlightSchedule schedule, LocalDate date, CabinClass cabin, FlightFaresResponse fares,
            LocalTime arriveTime, boolean arrivesNextDay, int seatsLeft, boolean bookable);
}
