package com.gotrips.gotrips_api.flight;

import org.springframework.data.domain.Sort;

public enum AdminFlightScheduleSort {
    DEPART_TIME_ASC("departTime", Sort.Direction.ASC),
    DEPART_TIME_DESC("departTime", Sort.Direction.DESC),
    FLIGHT_NUMBER_ASC("flightNumber", Sort.Direction.ASC),
    FLIGHT_NUMBER_DESC("flightNumber", Sort.Direction.DESC),
    ECONOMY_FARE_ASC("economyFare", Sort.Direction.ASC),
    ECONOMY_FARE_DESC("economyFare", Sort.Direction.DESC);

    private final Sort order;

    AdminFlightScheduleSort(String field, Sort.Direction direction) {
        order = Sort.by(new Sort.Order(direction, field), Sort.Order.asc("id"));
    }

    Sort order() {
        return order;
    }
}
