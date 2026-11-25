package com.gotrips.gotrips_api.user;

import org.mapstruct.Mapper;

import com.gotrips.gotrips_api.config.MapStructConfig;

@Mapper(config = MapStructConfig.class)
public interface UserMapper {

    UserResponse toResponse(User user);

    /** MapStruct dùng hàm này khi map {@code Set<Role>} sang {@code Set<RoleName>}. */
    default RoleName toRoleName(Role role) {
        return role.getName();
    }
}
