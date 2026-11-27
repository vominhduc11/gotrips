package com.gotrips.gotrips_api.hotel;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.gotrips.gotrips_api.common.error.InvalidRequestException;

import lombok.RequiredArgsConstructor;

/**
 * Đổi danh sách mã tiện ích nhân viên gửi lên thành các dòng trong danh mục. Bỏ mã trùng; mã lạ hoặc sai phạm vi
 * (ví dụ "Hồ bơi" cho loại phòng) là lỗi ở ô {@code amenityCodes}. DB không ép được phạm vi nên đây là chốt chặn.
 */
@Component
@RequiredArgsConstructor
class AmenityResolver {

    private static final String FIELD = "amenityCodes";

    private final AmenityRepository repository;

    /** @param target {@link AmenityScope#HOTEL} hoặc {@link AmenityScope#ROOM} */
    List<Amenity> resolve(List<String> codes, AmenityScope target) {
        List<String> unique = codes.stream().map(String::strip).distinct().toList();
        if (unique.size() > AdminHotelRules.MAX_AMENITIES) {
            throw new InvalidRequestException(FIELD, AdminHotelRules.TOO_MANY_AMENITIES);
        }
        if (unique.isEmpty()) {
            return List.of();
        }
        Map<String, Amenity> byCode = repository.findByCodeIn(unique).stream()
                .collect(Collectors.toMap(Amenity::getCode, Function.identity()));
        return unique.stream().map(code -> {
            Amenity amenity = byCode.get(code);
            if (amenity == null) {
                throw new InvalidRequestException(FIELD, "Tiện ích \"" + code + "\" không có trong danh mục.");
            }
            if (!amenity.getScope().allows(target)) {
                throw new InvalidRequestException(FIELD, "Tiện ích \"" + amenity.getName() + "\" không dùng cho "
                        + (target == AmenityScope.HOTEL ? "khách sạn." : "loại phòng."));
            }
            return amenity;
        }).toList();
    }
}
