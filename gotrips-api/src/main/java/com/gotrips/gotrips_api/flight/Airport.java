package com.gotrips.gotrips_api.flight;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Sân bay (dữ liệu tham chiếu cho ô tìm vé máy bay). Khoá chính là mã IATA vì web và form tìm vé dùng mã này
 * chứ không dùng id số và mã này giữ nguyên khi quản trị viên sửa sân bay.
 */
@Entity
@Table(name = "airports")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Airport {

    /** Mã IATA, 3 chữ in hoa, ví dụ "HAN". */
    @Id
    @Column(length = 3)
    private String code;

    /** Tên sân bay, ví dụ "Sân bay Nội Bài". */
    @Column(nullable = false, length = 150)
    private String name;

    /** Thành phố/khu vực phục vụ, ví dụ "Hà Nội". */
    @Column(nullable = false, length = 100)
    private String city;

    /** Thứ tự gợi ý: các đầu mối lớn trước. */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    static Airport create(String code, String name, String city, int sortOrder) {
        Airport airport = new Airport();
        airport.code = code;
        airport.update(name, city, sortOrder);
        return airport;
    }

    void update(String name, String city, int sortOrder) {
        this.name = name.strip();
        this.city = city.strip();
        this.sortOrder = sortOrder;
    }
}
