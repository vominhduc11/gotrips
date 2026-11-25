package com.gotrips.gotrips_api.testimonial;

import com.gotrips.gotrips_api.tour.Tour;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Đánh giá của khách sau chuyến đi, gắn với một tour. Chỉ để ĐỌC ở giai đoạn này. */
@Entity
@Table(name = "testimonials")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Testimonial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tour_id", nullable = false)
    private Tour tour;

    @Column(name = "customer_name", nullable = false, length = 100)
    private String customerName;

    @Column(name = "customer_city", nullable = false, length = 100)
    private String customerCity;

    /** 1–5. */
    @Column(nullable = false)
    private int rating;

    /** Cột {@code text} ở DB; JDBC báo là VARCHAR nên khớp với String khi Hibernate validate. */
    @Column(nullable = false)
    private String content;
}
