package com.gotrips.gotrips_api.common.catalog;

/**
 * Trạng thái của tour và khách sạn. Chỉ {@code ACTIVE} hiện trên website: truy vấn công khai luôn lọc {@code = ACTIVE}.
 * <ul>
 *   <li>{@code HIDDEN}: tạm ẩn — không hiển thị, không được đếm và không lộ tên ở bất kỳ API công khai nào.
 *   <li>{@code DELETED}: xoá mềm, giữ bản ghi cho đơn cũ. Chỉ khôi phục được (về {@code HIDDEN}).
 * </ul>
 */
public enum CatalogStatus {
    ACTIVE,
    HIDDEN,
    DELETED
}
