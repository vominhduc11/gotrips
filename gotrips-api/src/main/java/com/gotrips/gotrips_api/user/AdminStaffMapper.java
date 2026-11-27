package com.gotrips.gotrips_api.user;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.gotrips.gotrips_api.config.MapStructConfig;

@Mapper(config = MapStructConfig.class)
interface AdminStaffMapper {

    @Mapping(target = "role", expression = "java(user.hasRole(RoleName.ADMIN) ? AdminStaffRole.ADMIN : AdminStaffRole.STAFF)")
    AdminStaffResponse toResponse(User user);
}
