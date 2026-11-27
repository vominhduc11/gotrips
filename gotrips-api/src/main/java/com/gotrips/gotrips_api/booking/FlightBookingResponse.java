package com.gotrips.gotrips_api.booking;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import com.gotrips.gotrips_api.flight.CabinClass;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Phần riêng của đơn vé máy bay")
public record FlightBookingResponse(
        @Schema(requiredMode = REQUIRED) CabinClass cabin,
        @Schema(requiredMode = REQUIRED, nullable = true,
                description = "Ảnh minh hoạ (ảnh chặng bay phổ biến tới cùng điểm đến); null nếu không có chặng nào")
        String imageUrl,
        @Schema(requiredMode = REQUIRED, nullable = true) String imageAlt,
        @Schema(requiredMode = REQUIRED, description = "Chiều đi, rồi chiều về (nếu khứ hồi)")
        List<FlightSegmentResponse> segments,
        @Schema(requiredMode = REQUIRED) List<BookingPassengerResponse> passengers,
        @Schema(requiredMode = REQUIRED, description = "Các dòng tính tiền theo giá đã chốt")
        List<FlightPriceLineResponse> priceLines) {
}
