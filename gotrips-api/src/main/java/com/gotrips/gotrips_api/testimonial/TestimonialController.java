package com.gotrips.gotrips_api.testimonial;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/** Đánh giá của khách (công khai, không cần token). */
@RestController
@RequestMapping("/testimonials")
@RequiredArgsConstructor
@Tag(name = "Đánh giá", description = "Đánh giá của khách công khai cho website")
public class TestimonialController {

    private final TestimonialService testimonialService;

    @Operation(operationId = "listTestimonials", summary = "Đánh giá của khách",
            description = "Công khai. Theo id; không có đánh giá của tour HIDDEN.")
    @GetMapping
    public List<TestimonialResponse> list() {
        return testimonialService.listAll();
    }
}
