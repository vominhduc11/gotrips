package com.gotrips.gotrips_api.destination;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Điểm đến. Entity này hiện chỉ để ĐỌC (admin chưa có): không dùng để ghi vì chưa map hết các cột bắt buộc.
 */
@Entity
@Table(name = "destinations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Destination {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @Column(nullable = false, length = 150)
    private String name;

    /** Vùng miền, ví dụ "Tây Nguyên". */
    @Column(nullable = false, length = 100)
    private String region;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "image_alt", nullable = false)
    private String imageAlt;
}
