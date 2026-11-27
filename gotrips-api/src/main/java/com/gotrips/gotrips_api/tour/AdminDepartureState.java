package com.gotrips.gotrips_api.tour;

/** Trạng thái hiện tại của một chuyến ở trang quản trị. Thứ tự ưu tiên: PAST, CLOSED, SOLD_OUT, UPCOMING. */
public enum AdminDepartureState {
    /** Còn nhận khách. */
    UPCOMING,
    /** Đã đầy. */
    SOLD_OUT,
    /** Nhân viên đã đóng bán. */
    CLOSED,
    /** Khởi hành hôm nay hoặc đã qua: đã đóng đặt trực tuyến, không sửa được nữa. */
    PAST
}
