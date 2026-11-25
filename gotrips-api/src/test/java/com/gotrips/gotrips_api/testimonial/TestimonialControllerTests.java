package com.gotrips.gotrips_api.testimonial;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import com.gotrips.gotrips_api.support.CatalogApiTest;

class TestimonialControllerTests extends CatalogApiTest {

    @Test
    void listIsPublicAndEmptyWithoutData() throws Exception {
        mvc.perform(get("/testimonials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void listsTestimonialsByIdWithTheTourTitle() throws Exception {
        long destination = data.destination("phu-quoc", "Phú Quốc");
        long tourA = data.tour("tour-a", destination, true, "ACTIVE");
        long tourB = data.tour("tour-b", destination, false, "ACTIVE");
        long second = data.testimonial(tourB, "Trần Quốc Bảo");
        long first = data.testimonial(tourA, "Nguyễn Minh Anh");

        mvc.perform(get("/testimonials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                // Sắp theo id của đánh giá (chèn "second" trước nên có id nhỏ hơn).
                .andExpect(jsonPath("$[0].id").value(second))
                .andExpect(jsonPath("$[0].tourId").value(tourB))
                .andExpect(jsonPath("$[0].tourTitle").value("Tour tour-b"))
                .andExpect(jsonPath("$[0].customerName").value("Trần Quốc Bảo"))
                .andExpect(jsonPath("$[0].customerCity").value("Hà Nội"))
                .andExpect(jsonPath("$[0].rating").value(5))
                .andExpect(jsonPath("$[0].content").value("Rất hài lòng"))
                .andExpect(jsonPath("$[1].id").value(first))
                .andExpect(jsonPath("$[1].tourTitle").value("Tour tour-a"));
    }

    @Test
    void testimonialsOfHiddenToursAreNotReturned() throws Exception {
        long destination = data.destination("sapa", "Sapa");
        long hidden = data.tour("tour-an", destination, true, "HIDDEN");
        long active = data.tour("tour-hien", destination, true, "ACTIVE");
        data.testimonial(hidden, "Khách tour ẩn");
        long visible = data.testimonial(active, "Khách tour hiện");

        mvc.perform(get("/testimonials"))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(visible))
                // Tên tour đang ẩn không được lộ qua phần đánh giá.
                .andExpect(jsonPath("$[0].tourTitle").value("Tour tour-hien"));
    }
}
