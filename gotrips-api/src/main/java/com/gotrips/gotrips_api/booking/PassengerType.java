package com.gotrips.gotrips_api.booking;

import io.swagger.v3.oas.annotations.media.Schema;

/** Loại hành khách bay. Tuổi tính theo ngày bay chiều đi, xem {@link PassengerRules}. */
@Schema(enumAsRef = true, description = "Loại hành khách")
public enum PassengerType {
    ADULT,
    CHILD,
    INFANT
}
