package com.gotrips.gotrips_api.flight;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Hạng ghế (giá trị IN HOA, phân biệt hoa/thường, như {@code TourSort}). Web ánh xạ sang tên hạng ghế trên URL của nó
 * ở {@code lib/data/flight-request.ts}.
 */
@Schema(enumAsRef = true, description = "Hạng ghế")
public enum CabinClass {
    ECONOMY,
    PREMIUM_ECONOMY,
    BUSINESS,
    FIRST
}
