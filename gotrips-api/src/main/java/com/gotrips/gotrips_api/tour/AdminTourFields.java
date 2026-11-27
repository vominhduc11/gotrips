package com.gotrips.gotrips_api.tour;

/** Phần chung của request tạo và sửa tour. */
interface AdminTourFields {

    String slug();

    String title();

    Long destinationId();

    Integer durationDays();

    Integer durationNights();

    String departureCity();

    String shortDescription();

    String coverImageUrl();

    String coverImageAlt();

    Boolean featured();
}
