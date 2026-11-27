package com.gotrips.gotrips_api.hotel;

import java.util.List;

import com.gotrips.gotrips_api.common.catalog.AdminImageRequest;

/** Phần chung của request tạo và sửa khách sạn. */
interface AdminHotelFields {

    String slug();

    String name();

    Long destinationId();

    Integer starRating();

    String area();

    String imageUrl();

    String imageAlt();

    String description();

    List<String> amenityCodes();

    List<AdminImageRequest> images();

    String checkInTime();

    String checkOutTime();
}
