package com.gotrips.gotrips_api.booking;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Một dòng tính tiền của vé: một chặng × một loại hành khách")
public record FlightPriceLineResponse(
        @Schema(requiredMode = REQUIRED, description = "0 = chiều đi, 1 = chiều về") int segmentIndex,
        @Schema(requiredMode = REQUIRED) PassengerType passengerType,
        @Schema(requiredMode = REQUIRED, description = "Giá một hành khách đã chốt (VND)") long unitPrice,
        @Schema(requiredMode = REQUIRED) int quantity,
        @Schema(requiredMode = REQUIRED, description = "unitPrice × quantity (VND)") long amount) {
}
