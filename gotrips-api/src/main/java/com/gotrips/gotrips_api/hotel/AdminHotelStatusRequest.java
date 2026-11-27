package com.gotrips.gotrips_api.hotel;

import com.gotrips.gotrips_api.common.catalog.CatalogVisibility;

import jakarta.validation.constraints.NotNull;

public record AdminHotelStatusRequest(@NotNull(message = "Vui lòng chọn trạng thái.") CatalogVisibility status) {
}
