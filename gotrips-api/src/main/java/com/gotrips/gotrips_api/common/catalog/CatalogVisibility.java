package com.gotrips.gotrips_api.common.catalog;

/**
 * Trạng thái mà admin được ĐẶT trực tiếp. Tách khỏi {@link CatalogStatus} để request không thể nhận {@code DELETED}:
 * xoá và khôi phục có endpoint riêng với luật riêng.
 */
public enum CatalogVisibility {
    ACTIVE,
    HIDDEN;

    public CatalogStatus toStatus() {
        return this == ACTIVE ? CatalogStatus.ACTIVE : CatalogStatus.HIDDEN;
    }
}
