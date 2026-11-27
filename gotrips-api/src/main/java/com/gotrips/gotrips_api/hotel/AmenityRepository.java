package com.gotrips.gotrips_api.hotel;

import java.util.Collection;
import java.util.List;

import org.springframework.data.repository.Repository;

/** Danh mục tiện ích chỉ đọc nên kế thừa {@code Repository} trần: không lộ {@code save}/{@code delete}. */
public interface AmenityRepository extends Repository<Amenity, Long> {

    List<Amenity> findAllByOrderBySortOrderAscIdAsc();

    List<Amenity> findByCodeIn(Collection<String> codes);
}
