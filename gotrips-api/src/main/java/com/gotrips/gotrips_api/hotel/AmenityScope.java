package com.gotrips.gotrips_api.hotel;

/**
 * Tiện ích gắn được vào đâu (cột {@code amenities.scope}). Khoá ngoại ở bảng nối không ép được luật này nên API quản trị
 * phải tự kiểm.
 */
public enum AmenityScope {
    HOTEL,
    ROOM,
    BOTH;

    /** Tiện ích mang scope này có gắn được cho {@code target} ({@link #HOTEL} hoặc {@link #ROOM}) không. */
    boolean allows(AmenityScope target) {
        return this == BOTH || this == target;
    }
}
