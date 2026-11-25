package com.gotrips.gotrips_api.tour;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.gotrips.gotrips_api.config.MapStructConfig;

@Mapper(config = MapStructConfig.class)
public interface TourMapper {

    /**
     * Các trường của thẻ được chép sang theo tên; phần còn lại (mô tả, lịch khởi hành, đánh giá) truyền riêng vì không
     * nằm trên thẻ.
     */
    @Mapping(target = "shortDescription", source = "shortDescription")
    @Mapping(target = "departures", source = "departures")
    @Mapping(target = "testimonials", source = "testimonials")
    TourDetailResponse toDetail(TourCardResponse card, String shortDescription, List<TourDepartureResponse> departures,
            List<TourTestimonialResponse> testimonials);
}
