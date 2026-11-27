package com.gotrips.gotrips_api.flight;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;

/** Một chuyến bay cụ thể (lịch bay + ngày bay) ở một hạng ghế. */
@Schema(description = "Chuyến bay trong một ngày ở một hạng ghế")
public record FlightOptionResponse(
        @Schema(requiredMode = REQUIRED, description = "Id lịch bay") long scheduleId,
        @Schema(requiredMode = REQUIRED) AirlineResponse airline,
        @Schema(requiredMode = REQUIRED, example = "SV212") String flightNumber,
        @Schema(requiredMode = REQUIRED, description = "Sân bay đi") AirportResponse from,
        @Schema(requiredMode = REQUIRED, description = "Sân bay đến") AirportResponse to,
        @Schema(requiredMode = REQUIRED, description = "Ngày bay (YYYY-MM-DD)") LocalDate date,
        @Schema(requiredMode = REQUIRED, description = "Giờ cất cánh HH:mm", example = "08:30") String departTime,
        @Schema(requiredMode = REQUIRED, description = "Giờ hạ cánh HH:mm", example = "10:35") String arriveTime,
        @Schema(requiredMode = REQUIRED, description = "Hạ cánh sang ngày hôm sau") boolean arrivesNextDay,
        @Schema(requiredMode = REQUIRED) int durationMinutes,
        @Schema(requiredMode = REQUIRED) CabinClass cabin,
        @Schema(requiredMode = REQUIRED, description = "Giá hiện hành một hành khách mỗi loại") FlightFaresResponse fares,
        @Schema(requiredMode = REQUIRED, description = "Số ghế còn lại của hạng này trong ngày bay") int seatsLeft,
        @Schema(requiredMode = REQUIRED, description = "Đặt trực tuyến được: ngày bay sau hôm nay và còn đủ ghế cho "
                + "người lớn + trẻ em (em bé không chiếm ghế)") boolean isBookable) {
}
