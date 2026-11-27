package com.gotrips.gotrips_api.flight;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Hãng bay. Mã dùng làm khoá chính và giữ nguyên khi đổi tên. */
@Entity
@Table(name = "airlines")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Airline {

    /** Mã 2 ký tự, cũng là tiền tố số hiệu chuyến bay. */
    @Id
    @Column(length = 2)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    static Airline create(String code, String name) {
        Airline airline = new Airline();
        airline.code = code;
        airline.rename(name);
        return airline;
    }

    void rename(String name) {
        this.name = name.strip();
    }
}
