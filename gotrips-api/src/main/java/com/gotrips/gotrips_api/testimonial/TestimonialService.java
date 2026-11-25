package com.gotrips.gotrips_api.testimonial;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TestimonialService {

    private final TestimonialRepository testimonialRepository;
    private final TestimonialMapper testimonialMapper;

    @Transactional(readOnly = true)
    public List<TestimonialResponse> listAll() {
        return testimonialRepository.findOfTours(CatalogStatus.ACTIVE).stream()
                .map(testimonialMapper::toResponse)
                .toList();
    }
}
