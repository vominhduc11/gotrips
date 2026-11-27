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

/** Điểm đến. Ghi qua {@link #create} và {@link #update} (trang quản trị). */
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

    /** Dữ liệu phải đã được kiểm (annotation của request, URL ảnh, slug chưa dùng). */
    static Destination create(AdminDestinationRequest request) {
        Destination destination = new Destination();
        destination.update(request);
        return destination;
    }

    void update(AdminDestinationRequest request) {
        slug = request.slug();
        name = request.name();
        region = request.region();
        imageUrl = request.imageUrl();
        imageAlt = request.imageAlt();
    }
}
