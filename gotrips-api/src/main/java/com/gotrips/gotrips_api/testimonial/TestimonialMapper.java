package com.gotrips.gotrips_api.testimonial;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.gotrips.gotrips_api.config.MapStructConfig;

@Mapper(config = MapStructConfig.class)
public interface TestimonialMapper {

    @Mapping(target = "tourId", source = "tour.id")
    @Mapping(target = "tourTitle", source = "tour.title")
    TestimonialResponse toResponse(Testimonial testimonial);
}
