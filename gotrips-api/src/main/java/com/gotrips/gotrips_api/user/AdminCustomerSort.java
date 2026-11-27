package com.gotrips.gotrips_api.user;

public enum AdminCustomerSort {
    CREATED_DESC("u.created_at DESC, u.id DESC"),
    NAME_ASC("lower(u.full_name) ASC, u.id ASC"),
    PAID_DESC("total_paid DESC, u.id DESC");

    private final String orderBy;

    AdminCustomerSort(String orderBy) {
        this.orderBy = orderBy;
    }

    String orderBy() {
        return orderBy;
    }
}
