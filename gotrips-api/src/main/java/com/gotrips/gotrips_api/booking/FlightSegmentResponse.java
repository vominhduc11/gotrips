package com.gotrips.gotrips_api.booking;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.LocalDate;

import com.gotrips.gotrips_api.flight.AirlineResponse;
import com.gotrips.gotrips_api.flight.AirportResponse;
import com.gotrips.gotrips_api.flight.FlightFaresResponse;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Một chặng của đơn vé máy bay")
public record FlightSegmentResponse(
        @Schema(requiredMode = REQUIRED, description = "Id lịch bay") long scheduleId,
        @Schema(requiredMode = REQUIRED) AirlineResponse airline,
        @Schema(requiredMode = REQUIRED) String flightNumber,
        @Schema(requiredMode = REQUIRED) AirportResponse from,
        @Schema(requiredMode = REQUIRED) AirportResponse to,
        @Schema(requiredMode = REQUIRED, description = "Ngày bay (YYYY-MM-DD)") LocalDate date,
        @Schema(requiredMode = REQUIRED, description = "HH:mm") String departTime,
        @Schema(requiredMode = REQUIRED, description = "HH:mm") String arriveTime,
        @Schema(requiredMode = REQUIRED) boolean arrivesNextDay,
        @Schema(requiredMode = REQUIRED) int durationMinutes,
        @Schema(requiredMode = REQUIRED, description = "Giá một hành khách mỗi loại đã chốt lúc đặt")
        FlightFaresResponse fares) {
}
