package com.gotrips.gotrips_api.tour;

import com.gotrips.gotrips_api.common.catalog.CatalogVisibility;

import jakarta.validation.constraints.NotNull;

public record AdminTourStatusRequest(@NotNull(message = "Vui lòng chọn trạng thái.") CatalogVisibility status) {
}
