package com.gotrips.gotrips_api.config;

import org.mapstruct.MapperConfig;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/**
 * Cấu hình dùng chung cho mọi mapper MapStruct: khai báo {@code @Mapper(config = MapStructConfig.class)}.
 * <ul>
 *   <li>{@code SPRING}: mapper thành Spring bean để inject vào service.</li>
 *   <li>{@code ERROR}: field đích không được map sẽ làm build lỗi, tránh việc DTO thiếu dữ liệu một cách im lặng.</li>
 * </ul>
 */
@MapperConfig(
        componentModel = MappingConstants.ComponentModel.SPRING,
        unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface MapStructConfig {
}
