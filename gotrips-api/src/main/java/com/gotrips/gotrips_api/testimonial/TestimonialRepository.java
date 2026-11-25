package com.gotrips.gotrips_api.testimonial;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;

public interface TestimonialRepository extends JpaRepository<Testimonial, Long> {

    /**
     * Đánh giá của các tour đang hiển thị, theo id. Đánh giá của tour HIDDEN bị bỏ: nếu không thì tên tour đang ẩn
     * sẽ lộ ra qua phần đánh giá (mock ở web trước đây không lọc điểm này).
     * {@code join fetch} tour vì thẻ hiện tên tour và {@code open-in-view} đang tắt.
     */
    @Query("select t from Testimonial t join fetch t.tour tour where tour.status = :status order by t.id")
    List<Testimonial> findOfTours(@Param("status") CatalogStatus status);
}
